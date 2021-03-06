<template>
    <modal-dialog id="addEvalRounds" title="Add BNs to evaluate">
        <div class="container">
            <div class="row mb-3">
                <div class="col-sm-12">
                    <b class="mr-4">Game mode:</b>
                    <label
                        class="mx-1"
                        data-toggle="tooltip"
                        data-placement="top"
                        title="osu!"
                    >
                        <input
                            type="checkbox"
                            class="osu-radio hide-default"
                            name="mode"
                            value="osu"
                        >
                        <i class="fas fa-circle fa-lg" />
                    </label>
                    <label
                        class="mx-1"
                        data-toggle="tooltip"
                        data-placement="top"
                        title="osu!taiko"
                    >
                        <input
                            type="checkbox"
                            class="taiko-radio hide-default"
                            name="mode"
                            value="taiko"
                        >
                        <i class="fas fa-drum fa-lg" />
                    </label>
                    <label
                        class="mx-1"
                        data-toggle="tooltip"
                        data-placement="top"
                        title="osu!catch"
                    >
                        <input
                            type="checkbox"
                            class="catch-radio hide-default"
                            name="mode"
                            value="catch"
                        >
                        <i class="fas fa-apple-alt fa-lg" />
                    </label>
                    <label
                        class="mx-1"
                        data-toggle="tooltip"
                        data-placement="top"
                        title="osu!mania"
                    >
                        <input
                            type="checkbox"
                            class="mania-radio hide-default"
                            name="mode"
                            value="mania"
                        >
                        <i class="fas fa-stream fa-lg" />
                    </label>

                    <p class="small text-secondary ml-2">
                        Specify mode(s) for evaluations. Multi-mode BNs can generate multiple evaluations.
                    </p>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-sm-12">
                    <b class="mr-4">User group:</b>
                    <label
                        class="mx-2"
                        data-toggle="tooltip"
                        data-placement="top"
                        title="probation BN"
                    >
                        <input
                            type="checkbox"
                            class="probation-bn-radio hide-default"
                            name="group"
                            value="probationBn"
                        >
                        <i class="fab fa-accessible-icon" />
                    </label>
                    <label
                        class="mx-2"
                        data-toggle="tooltip"
                        data-placement="top"
                        title="full BN"
                    >
                        <input
                            type="checkbox"
                            class="full-bn-radio hide-default"
                            name="group"
                            value="fullBn"
                        >
                        <i class="fas fa-walking" />
                    </label>
                    <label
                        class="mx-2"
                        data-toggle="tooltip"
                        data-placement="top"
                        title="NAT"
                    >
                        <input
                            type="checkbox"
                            class="nat-radio hide-default"
                            name="group"
                            value="nat"
                        >
                        <i class="fas fa-running" />
                    </label>

                    <p class="small text-secondary ml-2">
                        Generate evaluations for all members of a user group. Only use this if you know what you're doing.
                    </p>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-sm-6">
                    <b>Include specific user(s):</b>
                    <input
                        v-model="includeUsers"
                        class="ml-2 form-control"
                        type="text"
                        placeholder="username1, username2, username3..."
                    >
                </div>
                <div class="col-sm-6">
                    <b>Exclude specific user(s):</b>
                    <input
                        v-model="excludeUsers"
                        class="ml-2 form-control"
                        type="text"
                        placeholder="username1, username2, username3..."
                    >
                </div>
            </div>

            <div class="row">
                <div class="col-sm-12">
                    <div class="form-inline">
                        <b>Deadline:</b>
                        <input
                            v-model="dateInput"
                            class="ml-1 form-control"
                            type="text"
                            placeholder="MM-DD-YYYY"
                            maxlength="10"
                            style="min-width: 125px; width: 125px;"
                        >
                    </div>

                    <small class="text-secondary ml-2 mt-1">
                        Only deadlines within the next 2 weeks will be displayed.
                    </small>
                </div>
            </div>

            <hr>

            <button class="btn btn-primary mb-2 mt-4 btn-block" @click="addEvalRounds($event)">
                Generate evaluations
            </button>
        </div>
    </modal-dialog>
</template>

<script>
import ModalDialog from '../ModalDialog.vue';
import postData from '../../mixins/postData.js';

export default {
    name: 'AddEvalRounds',
    components: {
        ModalDialog,
    },
    mixins: [postData],
    data() {
        return {
            includeUsers: null,
            excludeUsers: null,
            dateInput: this.setDefaultDate(),
        };
    },
    methods: {
        async addEvalRounds(e) {
            const confirmInput = confirm(`Are you sure?`);

            if (confirmInput) {
                let modes = [];

                $('input[name="mode"]:checked').each(function () {
                    modes.push(this.value);
                });

                if (!modes.length) {
                    this.$store.dispatch('updateToastMessages', {
                        message: `Must select game mode!`,
                        type: 'danger',
                    });

                    return;
                }

                let groups = [];

                $('input[name="group"]:checked').each(function () {
                    groups.push(this.value);
                });


                if (!groups.length && !this.includeUsers) {
                    this.$store.dispatch('updateToastMessages', {
                        message: `Must select user group or include specific users!`,
                        type: 'danger',
                    });

                    return;
                }

                const dateSplit = this.dateInput.split('-');
                const deadline = new Date(
                    parseInt(dateSplit[2], 10),
                    parseInt(dateSplit[0], 10) - 1,
                    parseInt(dateSplit[1], 10)
                );

                if (!(deadline instanceof Date) || isNaN(deadline)) {
                    this.$store.dispatch('updateToastMessages', {
                        message: `Invalid date!`,
                        type: 'danger',
                    });

                    return;
                }

                const result = await this.executePost(
                    '/bnEval/addEvalRounds/',
                    {
                        modes,
                        groups,
                        includeUsers: this.includeUsers,
                        excludeUsers: this.excludeUsers,
                        deadline,
                    },
                    e
                );

                if (result && !result.error) {
                    this.$store.commit('setEvalRounds', result.ers);
                    this.$store.dispatch('updateToastMessages', {
                        message: `Generated evaluations`,
                        type: 'success',
                    });

                    if (result.ers.length) {

                        if (result.failed.length) {
                            let errorMessage = 'The following usernames could not be processed: ';

                            for (let i = 0; i < result.failed.length; i++) {
                                errorMessage += result.failed[i];

                                if (i + 1 != result.failed.length) {
                                    errorMessage += ', ';
                                }
                            }

                            this.$store.dispatch('updateToastMessages', {
                                message: errorMessage,
                                type: 'danger',
                            });
                        } else {
                            $('#addEvalRounds').modal('hide');
                        }
                    } else {
                        this.$store.dispatch('updateToastMessages', {
                            message: `No eval rounds added. Maybe re-check spelling?`,
                            type: 'danger',
                        });
                    }
                }
            }
        },
        setDefaultDate() {
            const date = new Date();
            date.setDate(date.getDate() + 12);
            let month = (date.getMonth() + 1).toString();

            if (month.length == 1) {
                month = '0' + month;
            }

            let day = date.getDate().toString();

            if (day.length == 1) {
                day = '0' + day;
            }

            const year = date.getFullYear();

            return month + '-' + day + '-' + year;
        },
    },
};
</script>

<style>
</style>
