import mutations from "./transactions-info-mutations"
import actions from "./transactions-info-actions"

export default{

    state: {
        txsByHash: {},
    },

    actions,
    mutations,
}
