export const minionCost = (body: BodyPartConstant[]) => {
    return body.reduce((sum, p) => sum + BODYPART_COST[p], 0)
}

export const minionCostPerTick = (body: BodyPartConstant[]) => {
    const lifetime = body.includes(CLAIM) ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME
    return minionCost(body) / lifetime
}
