<template>
    <div>
        <p>
            <a :href="events && `#${eventsId}`" data-toggle="collapse">{{ header }} <i class="fas fa-angle-down" /></a>
            ({{ isLoading ? '...' : events ? events.length : '0' }})
        </p>
        <div v-if="events" :id="eventsId" class="collapse">
            <data-table
                v-if="events.length"
                :headers="['Date', 'Mapset']"
            >
                <tr v-for="event in events" :key="event.id">
                    <td class="text-nowrap">
                        {{ new Date(event.timestamp).toString().slice(4,10) }}
                    </td>
                    <td>
                        <a :href="'https://osu.ppy.sh/beatmapsets/' + event.beatmapsetId + '/discussion/-/events'" target="_blank">
                            <i v-if="event.modes.includes('osu')" class="far fa-circle" />
                            <i v-if="event.modes.includes('taiko')" class="fas fa-drum" />
                            <i v-if="event.modes.includes('catch')" class="fas fa-apple-alt" />
                            <i v-if="event.modes.includes('mania')" class="fas fa-stream" />
                            {{ event.metadata }}
                        </a>
                    </td>
                </tr>
            </data-table>
            <p v-else class="small ml-4">
                None...
            </p>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex';
import DataTable from '../../../DataTable.vue';

export default {
    name: 'EventsList',
    components: {
        DataTable,
    },
    props: {
        events: {
            type: Array,
            default() {
                return [];
            },
        },
        header: {
            type: String,
            required: true,
        },
        eventsId: {
            type: String,
            required: true,
        },
    },
    computed: {
        ...mapState({
            isLoading: (state) => state.userActivity.isLoading,
        }),
    },
};
</script>