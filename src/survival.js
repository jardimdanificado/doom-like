import CONFIG from '../data/config/config.js';

const DEFAULT_MAX_HUNGER = 100;
const DEFAULT_MAX_THIRST = 100;
const DEFAULT_HUNGER_DECAY = 0.025;
const DEFAULT_THIRST_DECAY = 0.03;

function ensureEntityNeeds(entity) {
    if (!entity) return;
    if (typeof entity.maxHunger !== 'number') entity.maxHunger = DEFAULT_MAX_HUNGER;
    if (typeof entity.maxThirst !== 'number') entity.maxThirst = DEFAULT_MAX_THIRST;
    if (typeof entity.hunger !== 'number') entity.hunger = entity.maxHunger;
    if (typeof entity.thirst !== 'number') entity.thirst = entity.maxThirst;
    if (typeof entity.damageBonus !== 'number') entity.damageBonus = 0;
    if (typeof entity.speedBonus !== 'number') entity.speedBonus = 0;
    if (typeof entity.regenBonus !== 'number') entity.regenBonus = 0;
    if (typeof entity.throwStrengthBonus !== 'number') entity.throwStrengthBonus = 0;
    if (typeof entity.throwSpeedBonus !== 'number') entity.throwSpeedBonus = 0;
    if (typeof entity.throwDistanceBonus !== 'number') entity.throwDistanceBonus = 0;
    if (typeof entity.damageReduction !== 'number') entity.damageReduction = 0;
    if (!Array.isArray(entity.activeNeedEffects)) {
        entity.activeNeedEffects = [];
    }
    if (!entity.needDecay) {
        entity.hungerDecayRate = entity.hungerDecayRate || DEFAULT_HUNGER_DECAY;
        entity.thirstDecayRate = entity.thirstDecayRate || DEFAULT_THIRST_DECAY;
        entity.needDecay = true;
    }
}

function applyModifiers(entity, modifiers, sign = 1) {
    if (!entity || !modifiers) return;
    const delta = (value) => (typeof value === 'number' ? value * sign : 0);
    if (modifiers.maxHunger) {
        if (!entity.baseMaxHunger) entity.baseMaxHunger = entity.maxHunger;
        entity.maxHunger = Math.max(10, (entity.maxHunger || DEFAULT_MAX_HUNGER) + delta(modifiers.maxHunger));
        entity.hunger = Math.min(entity.hunger, entity.maxHunger);
    }
    if (modifiers.maxThirst) {
        if (!entity.baseMaxThirst) entity.baseMaxThirst = entity.maxThirst;
        entity.maxThirst = Math.max(10, (entity.maxThirst || DEFAULT_MAX_THIRST) + delta(modifiers.maxThirst));
        entity.thirst = Math.min(entity.thirst, entity.maxThirst);
    }
    if (modifiers.maxHP) {
        if (!entity.baseMaxHP) entity.baseMaxHP = entity.maxHP || 0;
        entity.maxHP = Math.max(10, (entity.maxHP || 0) + delta(modifiers.maxHP));
        if (entity.hp > entity.maxHP) {
            entity.hp = entity.maxHP;
        }
    }
    if (modifiers.damage) {
        entity.damageBonus = (entity.damageBonus || 0) + delta(modifiers.damage);
    }
    if (modifiers.speed) {
        entity.speedBonus = (entity.speedBonus || 0) + delta(modifiers.speed);
    }
    if (modifiers.jump) {
        entity.jumpBonus = (entity.jumpBonus || 0) + delta(modifiers.jump);
    }
    if (modifiers.regen) {
        entity.regenBonus = (entity.regenBonus || 0) + delta(modifiers.regen);
    }
    if (modifiers.throwStrength) {
        entity.throwStrengthBonus = (entity.throwStrengthBonus || 0) + delta(modifiers.throwStrength);
    }
    if (modifiers.throwSpeed) {
        entity.throwSpeedBonus = (entity.throwSpeedBonus || 0) + delta(modifiers.throwSpeed);
    }
    if (modifiers.throwDistance) {
        entity.throwDistanceBonus = (entity.throwDistanceBonus || 0) + delta(modifiers.throwDistance);
    }
    if (modifiers.damageReduction) {
        entity.damageReduction = (entity.damageReduction || 0) + delta(modifiers.damageReduction);
    }
    if (modifiers.hungerDecay) {
        const base = entity.hungerDecayRate || DEFAULT_HUNGER_DECAY;
        entity.hungerDecayRate = Math.max(0.001, base + delta(modifiers.hungerDecay));
    }
    if (modifiers.thirstDecay) {
        const base = entity.thirstDecayRate || DEFAULT_THIRST_DECAY;
        entity.thirstDecayRate = Math.max(0.001, base + delta(modifiers.thirstDecay));
    }
}

export function setupEntityNeeds(entity, { maxHunger = DEFAULT_MAX_HUNGER, maxThirst = DEFAULT_MAX_THIRST, hungerDecay = DEFAULT_HUNGER_DECAY, thirstDecay = DEFAULT_THIRST_DECAY } = {}) {
    if (!entity) return;
    ensureEntityNeeds(entity);
    entity.maxHunger = maxHunger;
    entity.maxThirst = maxThirst;
    entity.hunger = Math.min(entity.hunger, entity.maxHunger);
    entity.thirst = Math.min(entity.thirst, entity.maxThirst);
    entity.hungerDecayRate = hungerDecay;
    entity.thirstDecayRate = thirstDecay;
}

export function applyNeedRestoration(entity, { hunger = 0, thirst = 0 } = {}) {
    if (!entity) return;
    ensureEntityNeeds(entity);
    if (hunger) {
        entity.hunger = Math.min(entity.maxHunger, (entity.hunger || 0) + hunger);
    }
    if (thirst) {
        entity.thirst = Math.min(entity.maxThirst, (entity.thirst || 0) + thirst);
    }
}

export function applyPermanentNeedModifiers(entity, modifiers = {}) {
    if (!entity) return;
    applyModifiers(entity, modifiers, 1);
}

export function applyTimedNeedModifier(entity, effect = {}) {
    if (!entity) return false;
    const { id, duration = 6, modifiers = {} } = effect;
    if (!id || !Object.keys(modifiers).length) return false;
    ensureEntityNeeds(entity);
    const existing = entity.activeNeedEffects.find((entry) => entry.id === id);
    if (existing) {
        applyModifiers(entity, existing.modifiers, -1);
        entity.activeNeedEffects = entity.activeNeedEffects.filter((entry) => entry.id !== id);
    }
    applyModifiers(entity, modifiers, 1);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    entity.activeNeedEffects.push({
        id,
        modifiers,
        expiresAt: now + duration * 1000
    });
    return true;
}

export function updateEntityNeeds(entity) {
    if (!entity) return;
    ensureEntityNeeds(entity);
    const hungerDecay = entity.hungerDecayRate || DEFAULT_HUNGER_DECAY;
    const thirstDecay = entity.thirstDecayRate || DEFAULT_THIRST_DECAY;
    entity.hunger = Math.max(0, (entity.hunger || entity.maxHunger) - hungerDecay);
    entity.thirst = Math.max(0, (entity.thirst || entity.maxThirst) - thirstDecay);
    const hungerRatio = entity.hunger / Math.max(1, entity.maxHunger);
    const thirstRatio = entity.thirst / Math.max(1, entity.maxThirst);
    entity.hungerPenalty = hungerRatio < 0.4 ? (0.4 - hungerRatio) * 0.4 : 0;
    entity.thirstPenalty = thirstRatio < 0.4 ? (0.4 - thirstRatio) * 0.5 : 0;
    if (entity.hunger <= 0 || entity.thirst <= 0) {
        entity.hp = Math.max(0, (entity.hp || 0) - 0.03);
    }
    if (entity.regenBonus > 0 && typeof entity.maxHP === 'number') {
        entity.hp = Math.min(entity.maxHP, (entity.hp || entity.maxHP) + entity.regenBonus);
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    entity.activeNeedEffects = (entity.activeNeedEffects || []).filter((effect) => {
        if (effect.expiresAt <= now) {
            applyModifiers(entity, effect.modifiers, -1);
            return false;
        }
        return true;
    });
}

export function getEntityMoveSpeed(entity) {
    ensureEntityNeeds(entity);
    const penalty = (entity.hungerPenalty || 0) + (entity.thirstPenalty || 0);
    const base = CONFIG.MOVE_SPEED + (entity.speedBonus || 0);
    return Math.max(0.02, base - penalty);
}

export function getEntityDamageBonus(entity) {
    ensureEntityNeeds(entity);
    const penalty = (entity.hungerPenalty || 0) + (entity.thirstPenalty || 0);
    return Math.max(0, (entity.damageBonus || 0) - penalty * 2);
}

export function getEntityThrowSpeedBonus(entity) {
    ensureEntityNeeds(entity);
    return entity.throwSpeedBonus || 0;
}

export function getEntityThrowStrengthBonus(entity) {
    ensureEntityNeeds(entity);
    return entity.throwStrengthBonus || 0;
}

export function getEntityThrowDistanceBonus(entity) {
    ensureEntityNeeds(entity);
    return entity.throwDistanceBonus || 0;
}

export function getEntityDamageReduction(entity) {
    ensureEntityNeeds(entity);
    return entity.damageReduction || 0;
}
