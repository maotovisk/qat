<template>
    <div>
        <p>
            <b>Reports:</b>
        </p>

        <ul class="small text-secondary">
            <li v-if="!userReports">
                ...
            </li>
            <li v-else-if="!userReports.length">
                User has no reports
            </li>
            <li
                v-for="report in userReports"
                v-else
                :key="report.id"
            >
                <a :href="'http://bn.mappersguild.com/managereports?report=' + report.id">{{ report.createdAt.slice(0,10) }}</a>
                -
                <span :class="`text-${report.valid == 1 ? 'success' : report.valid == 2 ? 'neutral' : report.valid == 3 ? 'danger' : ''}`">
                    {{ report.valid == 1 ? 'VALID' : report.valid == 2 ? 'PARTIALLY VALID' : report.valid == 3 ? 'INVALID' : '' }}
                </span>

                <div v-html="$md.render(report.reason)" />
            </li>
        </ul>
    </div>
</template>

<script>
import postData from '../../../../mixins/postData.js';

export default {
    name: 'UserReports',
    mixins: [postData],
    props: {
        userMongoId: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            userReports: null,
        };
    },
    watch: {
        userMongoId() {
            this.findUserReports();
        },
    },
    mounted() {
        this.findUserReports();
    },
    methods: {
        async findUserReports() {
            this.userReports = null;
            const res = await this.executeGet('/bnEval/findUserReports/' + this.userMongoId);

            if (res) {
                this.userReports = res.userReports;
            }
        },
    },
};
</script>