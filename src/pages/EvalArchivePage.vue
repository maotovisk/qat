<template>
    <div class="row">
        <div class="col-md-12">
            <section class="card card-body">
                <div class="form-inline">
                    <input
                        v-model="searchValue"
                        type="text"
                        placeholder="username or osuID..."
                        maxlength="18"
                        autocomplete="off"
                        class="form-control"
                        @keyup.enter="query($event)"
                    >
                    <button class="btn btn-sm btn-primary ml-2" type="submit" @click="query($event)">
                        Search archives
                    </button>
                </div>

                <div class="form-inline mt-2">
                    <input
                        v-model="limit"
                        type="text"
                        placeholder="# entries..."
                        maxlength="3"
                        autocomplete="off"
                        class="form-control"
                        @keyup.enter="queryRecent($event)"
                    >
                    <button class="btn btn-sm btn-primary ml-2" type="submit" @click="queryRecent($event)">
                        Show recent
                    </button>
                </div>
            </section>

            <section v-if="isQueried" class="card card-body">
                <h2>Application Evaluations</h2>

                <transition-group
                    v-if="applications.length"
                    name="list"
                    tag="div"
                    class="row"
                >
                    <application-discussion-card
                        v-for="application in applications"
                        :key="application.id"
                        :application="application"
                        :mode="application.mode"
                        :is-archive="true"
                    />
                </transition-group>

                <p v-else class="ml-4">
                    None...
                </p>
            </section>

            <section v-if="isQueried" class="card card-body">
                <h2>BN Evaluations</h2>

                <transition-group
                    v-if="evalRounds.length"
                    name="list"
                    tag="div"
                    class="row"
                >
                    <current-bn-discussion-card
                        v-for="evalRound in evalRounds"
                        :key="evalRound.id"
                        :eval-round="evalRound"
                        :is-archive="true"
                    />
                </transition-group>

                <p v-else class="ml-4">
                    None...
                </p>
            </section>

            <application-archive-info />

            <current-bn-archive-info />

            <toast-messages />
        </div>
    </div>
</template>



<script>
import { mapState } from 'vuex';
import ToastMessages from '../components/ToastMessages.vue';
import ApplicationDiscussionCard from '../components/evaluations/applications/ApplicationDiscussionCard.vue';
import CurrentBnDiscussionCard from '../components/evaluations/currentBnEvaluations/CurrentBnDiscussionCard.vue';
import ApplicationArchiveInfo from '../components/evaluations/applications/ApplicationArchiveInfo.vue';
import CurrentBnArchiveInfo from '../components/evaluations/currentBnEvaluations/CurrentBnArchiveInfo.vue';
import postData from '../mixins/postData.js';

export default {
    name: 'EvalArchivePage',
    components: {
        ToastMessages,
        ApplicationDiscussionCard,
        CurrentBnDiscussionCard,
        ApplicationArchiveInfo,
        CurrentBnArchiveInfo,
    },
    mixins: [postData],
    data() {
        return {
            searchValue: null,
            limit: null,
        };
    },
    computed: {
        ...mapState([
            'applications',
            'evalRounds',
            'isQueried',
        ]),
    },
    async created() {
        const params = new URLSearchParams(document.location.search.substring(1));

        if (params.get('user') && params.get('user').length) {
            const res = await this.executeGet(`/evalArchive/search/${params.get('user')}`);

            if (res) {
                this.$store.commit('setIsQueried', true);
                this.$store.commit('setEvaluator', res.evaluator);
                this.$store.commit('setApplications', res.bnApplications);
                this.$store.commit('setEvalRounds', res.evalRounds);
            }
        } else if (params.get('eval') && params.get('eval').length) {
            const res = await this.executeGet(`/evalArchive/searchById/${params.get('eval')}`);

            if (res) {
                this.$store.commit('setEvaluator', res.evaluator);

                if (res.round) {
                    this.$store.commit('setIsQueried', true);

                    if (res.round.applicant) {
                        this.$store.commit('setSelectedDiscussApplicationId', res.round.id);
                        this.$store.commit('setApplications', [res.round]);
                        $('#applicationArchiveInfo').modal('show');
                    } else {
                        this.$store.commit('setSelectedDiscussRoundId', res.round.id);
                        this.$store.commit('setEvalRounds', [res.round]);
                        $('#currentBnArchiveInfo').modal('show');
                    }
                }
            }
        } else {
            const res = await this.executeGet('/evalArchive/relevantInfo');

            if (res) {
                this.$store.commit('setEvaluator', res.evaluator);
            }
        }

        $('#loading').fadeOut();
        $('#main')
            .attr('style', 'visibility: visible')
            .hide()
            .fadeIn();
    },
    methods: {
        async query(e) {
            if (!this.searchValue || !this.searchValue.length) {
                this.$store.dispatch('updateToastMessages', {
                    message: `Must enter username or osu ID!`,
                    type: 'danger',
                });
            } else {
                history.pushState(null, 'Evaluation Archives', `/evalArchive?user=${this.searchValue}`);
                const res = await this.executeGet('/evalArchive/search/' + this.searchValue, e);

                if (res && !res.error) {
                    this.$store.commit('setIsQueried', true);
                    this.$store.commit('setApplications', res.bnApplications);
                    this.$store.commit('setEvalRounds', res.evalRounds);
                }
            }
        },
        async queryRecent(e) {
            if (!parseInt(this.limit)) {
                this.$store.dispatch('updateToastMessages', {
                    message: `Invalid number!`,
                    type: 'danger',
                });
            } else {
                const res = await this.executeGet('/evalArchive/searchRecent/' + this.limit, e);

                if (res && !res.error) {
                    this.$store.commit('setIsQueried', true);
                    this.$store.commit('setApplications', res.bnApplications);
                    this.$store.commit('setEvalRounds', res.evalRounds);
                }
            }
        },
    },
};
</script>