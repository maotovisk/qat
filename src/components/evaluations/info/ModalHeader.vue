<template>
    <div class="modal-header" :class="isNatEvaluator() ? 'bg-info' : 'bg-primary'">
        <h5 class="modal-title">
            {{ isApplication ? 'Application Evaluation:' : 'BN Evaluation:' }}
            <a
                :href="'https://osu.ppy.sh/users/' + osuId"
                target="_blank"
                @click.stop
            >
                {{ username }}
            </a>
            <i v-if="mode == 'osu'" class="far fa-circle" />
            <i v-else-if="mode == 'taiko'" class="fas fa-drum" />
            <i v-else-if="mode == 'catch'" class="fas fa-apple-alt" />
            <i v-else-if="mode == 'mania'" class="fas fa-stream" />
        </h5>
        <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
        </button>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
    name: 'ModalHeader',
    props: {
        isApplication: Boolean,
        osuId: {
            type: Number,
            required: true,
        },
        username: {
            type: String,
            required: true,
        },
        mode: {
            type: String,
            required: true,
        },
        natEvaluators: {
            type: Array,
            default() {
                return [];
            },
        },
    },
    computed: {
        ...mapGetters([
            'evaluatorId',
        ]),
    },
    methods: {
        isNatEvaluator() {
            for (let i = 0; i < this.natEvaluators.length; i++) {
                let user = this.natEvaluators[i];

                if (user.id == this.evaluatorId) {
                    return true;
                }
            }

            return false;
        },
    },
};
</script>