const express = require('express');
const api = require('../helpers/api');
const User = require('../models/user');
const Logger = require('../models/log');
const BnApp = require('../models/bnApp');
const EvalRound = require('../models/evalRound');
const Aiess = require('../models/aiess');
const Note = require('../models/note');

const router = express.Router();

router.use(api.isLoggedIn);

const defaultNotePopulate = [
    { path: 'author', select: 'username osuId' },
    { path: 'user', select: 'username osuId' },
];

const evaluationsPopulate = [
    {
        path: 'evaluations',
        select: 'evaluator',
    },
];

const appPopulate = [
    { path: 'applicant', select: 'username osuId' },
    { path: 'bnEvaluators', select: 'username osuId' },
    { path: 'test', select: 'totalScore' },
    {
        path: 'evaluations',
        select: 'evaluator behaviorComment moddingComment vote',
        populate: {
            path: 'evaluator',
            select: 'username osuId group',
        },
    },
];

/* GET bn app page */
router.get('/', (req, res) => {
    res.render('users', {
        title: 'BN/NAT Listing',
        script: '../javascripts/users.js',
        isUsers: true,
        isBn: res.locals.userRequest.isBn,
        isNat: res.locals.userRequest.isNat || res.locals.userRequest.isSpectator,
    });
});

/* GET applicant listing. */
router.get('/relevantInfo', async (req, res) => {
    const users = await User.find({
        $or: [
            { group: 'nat' },
            { group: 'bn' },
        ],
    }).sort({ username: 1 });

    res.json({
        users,
        userId: req.session.mongoId,
        isNat: res.locals.userRequest.group == 'nat' || res.locals.userRequest.isSpectator,
        isBn: res.locals.userRequest.group == 'bn',
    });
});

/* POST switch bn evaluator */
router.post('/switchBnEvaluator/:id', api.isBnOrNat, async (req, res) => {
    const u = await User.findByIdAndUpdate(req.params.id, {
        isBnEvaluator: !req.body.isBnEvaluator,
    });

    res.json(u);
    Logger.generate(req.session.mongoId, `Opted "${u.username}" ${u.isBnEvaluator ? 'in to' : 'out of'} optional BN app evaluation input`);
});

/* GET user notes */
router.get('/loadUserNotes/:id', api.isNat, async (req, res) => {
    const notes = await Note
        .find({
            user: req.params.id,
            isHidden: { $ne: true },
        })
        .populate(defaultNotePopulate)
        .sort({ createdAt: -1 });

    res.json(notes);
});

/* POST save note */
router.post('/saveNote/:id', api.isNat, async (req, res) => {
    let note = await Note.create({
        author: req.session.mongoId,
        user: req.params.id,
        comment: req.body.comment,
    });
    note = await Note
        .findById(note._id)
        .populate(defaultNotePopulate);

    res.json(note);

    let u = await User.findById(req.params.id);

    Logger.generate(
        req.session.mongoId,
        `Added user note to "${u.username}"`
    );

    api.webhookPost(
        [{
            author: api.defaultWebhookAuthor(req.session),
            color: api.webhookColors.brown,
            description: `Added note to [**${note.user.username}**'s profile](http://bn.mappersguild.com/users?id=${note.user.id})`,
            fields: [
                {
                    name: 'Note',
                    value: req.body.comment.length > 950 ? req.body.comment.slice(0,950) + '... *(truncated)*' : req.body.comment,
                },
            ],
        }],
        u.modes[0]
    );
});

/* POST hide note */
router.post('/hideNote/:id', api.isNat, async (req, res) => {
    await Note.findByIdAndUpdate(req.params.id, { isHidden: true });

    res.json({});
    let u = await User.findById(req.body.userId);
    Logger.generate(
        req.session.mongoId,
        `Removed user note from "${u.username}"`
    );
});

/* POST edit note */
router.post('/editNote/:id', api.isNat, async (req, res) => {
    const n = await Note
        .findByIdAndUpdate(req.params.id, { comment: req.body.comment })
        .populate(defaultNotePopulate);

    res.json(n);
    let u = await User.findById(n.user);
    Logger.generate(
        req.session.mongoId,
        `edited user note for "${u.username}"`
    );
});

/* GET user next evaluation */
router.get('/loadNextEvaluation/:id', async (req, res) => {
    let er = await EvalRound.findOne({ bn: req.params.id, active: true });

    if (!er) {
        return res.json('Never');
    }

    res.json(er.deadline);
});

/* GET all users with badge info */
router.get('/findUserBadgeInfo', async (req, res) => {
    const u = await User.find({
        $or: [
            { 'bnDuration.0': { $exists: true } },
            { 'natDuration.0': { $exists: true } },
        ],
    }).sort({ username: 1 });

    res.json(u);
});

/* POST edit badge value */
router.post('/editBadgeValue/:id', async (req, res) => {
    let u = await User.findById(req.params.id);

    if (res.locals.userRequest.osuId == '3178418') { //i dont want anyone else messing with this
        let years;
        let num = req.body.add ? 1 : -1;

        if (req.body.group == 'bn') {
            years = u.bnProfileBadge + num;
            await User.findByIdAndUpdate(req.params.id, { bnProfileBadge: years });
        } else {
            years = u.natProfileBadge + num;
            await User.findByIdAndUpdate(req.params.id, { natProfileBadge: years });
        }
    }

    u = await User.findById(req.params.id);
    res.json(u);
});

router.get('/findNatActivity/:days/:mode', async (req, res) => {
    let minAppDate = new Date();
    minAppDate.setDate(minAppDate.getDate() - (parseInt(req.params.days) + 14));
    let minEvalDate = new Date();
    minEvalDate.setDate(minEvalDate.getDate() - (parseInt(req.params.days)));
    let maxDate = new Date();
    const [users, bnApps, bnRounds] = await Promise.all([
        User
            .find({
                group: 'nat',
                modes: req.params.mode,
                isSpectator: { $ne: true },
            })
            .sort({ username: 1 }),

        BnApp
            .find({
                mode: req.params.mode,
                createdAt: { $gte: minAppDate, $lte: maxDate },
                discussion: true,
            })
            .populate(evaluationsPopulate),

        EvalRound
            .find({
                mode: req.params.mode,
                deadline: { $gte: minEvalDate, $lte: maxDate },
                discussion: true,
            })
            .populate(evaluationsPopulate),
    ]);
    let bnAppsCount = bnApps.length;
    let evalRoundsCount = bnRounds.length;
    const invalids = [8129817, 3178418];
    let info = [];
    users.forEach(user => {
        if (invalids.indexOf(user.osuId) == -1) {
            let evalsOnBnApps = 0;
            let evalsOnCurrentBnEvals = 0;
            let feedbackCount = 0;
            bnApps.forEach(app => {
                app.evaluations.forEach(evaluation => {
                    if (evaluation.evaluator == user.id) {
                        evalsOnBnApps++;
                    }
                });

                if (app.feedbackAuthor == user.id) {
                    feedbackCount++;
                }
            });
            bnRounds.forEach(round => {
                round.evaluations.forEach(evaluation => {
                    if (evaluation.evaluator == user.id) {
                        evalsOnCurrentBnEvals++;
                    }
                });

                if (round.feedbackAuthor == user.id) {
                    feedbackCount++;
                }
            });
            info.push({
                username: user.username,
                osuId: user.osuId,
                totalBnAppEvals: evalsOnBnApps,
                totalCurrentBnEvals: evalsOnCurrentBnEvals,
                totalWrittenFeedbacks: feedbackCount,
                joinDate: user.natDuration[user.natDuration.length - 1],
            });
        }
    });

    res.json({ info, bnAppsCount, evalRoundsCount });
});

router.get('/findBnActivity/:days/:mode', async (req, res) => {
    let minDate = new Date();
    minDate.setDate(minDate.getDate() - parseInt(req.params.days));
    let maxDate = new Date();
    const [users, allEvents, allActiveEvalRounds, allQualityAssuranceChecks] = await Promise.all([
        User.find({
            group: 'bn',
            modes: req.params.mode,
            isSpectator: { $ne: true },
        }).sort({ username: 1 }),
        Aiess.getAllActivity(minDate, maxDate, req.params.mode),
        EvalRound.find({ active: true }),
        Aiess.find({ qualityAssuranceCheckers: { $exists: true, $ne: [] }, timestamp: { $gt: minDate } }),
    ]);

    let info = [];
    users.forEach(user => {
        let uniqueNominations = [];
        let nominationResets = 0;
        let qualityAssuranceChecks = 0;

        for (let i = 0; i < allEvents.length; i++) {
            const eventType = allEvents[i]._id;
            const events = allEvents[i].events;

            if (eventType == 'Bubbled' || eventType == 'Qualified') {
                for (let j = 0; j < events.length; j++) {
                    let event = events[j];

                    if (event.userId == user.osuId) {
                        if (uniqueNominations.length == 0) {
                            uniqueNominations.push(events);
                        } else if (!uniqueNominations.find(n => n.beatmapsetId == event.beatmapsetId)) {
                            uniqueNominations.push(event);
                        }
                    }
                }
            } else if (eventType == 'Popped' || eventType == 'Disqualified') {
                for (let j = 0; j < events.length; j++) {
                    if (events[j].userId == user.osuId) {
                        nominationResets++;
                    }
                }
            }
        }

        for (let i = 0; i < allQualityAssuranceChecks.length; i++) {
            const event = allQualityAssuranceChecks[i];

            if (event.qualityAssuranceCheckers.includes(user.id)) {
                qualityAssuranceChecks++;
            }
        }

        let deadline;

        for (let i = 0; i < allActiveEvalRounds.length; i++) {
            const evalRound = allActiveEvalRounds[i];

            if (evalRound.bn == user.id) {
                deadline = evalRound.deadline;
                break;
            }
        }

        if (!deadline) deadline = 'Never';

        info.push({
            username: user.username,
            osuId: user.osuId,
            uniqueNominations: uniqueNominations.length,
            nominationResets,
            joinDate: user.bnDuration[user.bnDuration.length - 1],
            nextEvaluation: deadline,
            qualityAssuranceChecks,
        });
    });

    res.json(info);
});

/* GET potential NAT info */
router.get('/findPotentialNatInfo/', async (req, res) => {
    const [users, applications] = await Promise.all([
        User.find({
            group: 'bn',
            isSpectator: { $ne: true },
            isBnEvaluator: true,
        }).sort({ username: 1 }),
        BnApp.find({
            bnEvaluators: {
                $exists: true,
                $not: { $size: 0 },
            },
            active: false,
        }).populate(appPopulate),
    ]);

    let info = [];
    users.forEach(user => {
        let evaluatedApps = [];
        applications.forEach(app => {
            app.evaluations.forEach(evaluation => {
                if (evaluation.evaluator.id == user.id) {
                    evaluatedApps.push(app);
                }
            });
        });
        info.push({ username: user.username, osuId: user.osuId, modes: user.modes, evaluatedApps });
    });

    res.json(info);
});

module.exports = router;
