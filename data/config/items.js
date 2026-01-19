import { applyNeedRestoration, applyTimedNeedModifier, applyPermanentNeedModifiers } from '../../src/survival.js';

const createFoodItem = (id, name, textureKey, hungerRestore, thirstRestore = 0) => ({
    id,
    name,
    placeable: false,
    textureKey,
    isConsumable: true,
    use: (_, entity) => {
        if (!entity) return false;
        applyNeedRestoration(entity, {
            hunger: hungerRestore,
            thirst: thirstRestore
        });
        return true;
    }
});

const createPotionItem = (id, name, textureKey, modifiers, duration = 10, restoration = {}) => ({
    id,
    name,
    placeable: false,
    textureKey,
    isConsumable: true,
    use: (_, entity) => {
        if (!entity) return false;
        if (restoration.hunger || restoration.thirst) {
            applyNeedRestoration(entity, restoration);
        }
        applyTimedNeedModifier(entity, {
            id,
            duration,
            modifiers
        });
        return true;
    }
});

const createScrollItem = (id, name, textureKey, modifiers, duration = 10) => ({
    id,
    name,
    placeable: false,
    textureKey,
    isConsumable: true,
    use: (_, entity) => {
        if (!entity) return false;
        applyTimedNeedModifier(entity, {
            id,
            duration,
            modifiers
        });
        return true;
    }
});

const createPermanentItem = (id, name, textureKey, modifiers = {}, restoration = {}) => ({
    id,
    name,
    placeable: false,
    textureKey,
    isConsumable: true,
    use: (_, entity) => {
        if (!entity) return false;
        if (restoration.hunger || restoration.thirst) {
            applyNeedRestoration(entity, restoration);
        }
        if (Object.keys(modifiers).length) {
            applyPermanentNeedModifiers(entity, modifiers);
        }
        return true;
    }
});

export default {
    FOOD_APPLE: createFoodItem('food_apple', 'Maçã', 'food_apple', 18, 6),
    FOOD_APRICOT: createFoodItem('food_apricot', 'Damasco', 'food_apricot', 14, 4),
    FOOD_BANANA: createFoodItem('food_banana', 'Banana', 'food_banana', 18, 6),
    FOOD_BEEF_JERKY: createFoodItem('food_beef_jerky', 'Carne Seca', 'food_beef_jerky', 26),
    FOOD_BONE: createFoodItem('food_bone', 'Osso', 'food_bone', 6),
    FOOD_BREAD_RATION: createFoodItem('food_bread_ration', 'Ração de Pão', 'food_bread_ration', 24),
    FOOD_CHEESE: createFoodItem('food_cheese', 'Queijo Curado', 'food_cheese', 22),
    FOOD_CHOKO: createFoodItem('food_choko', 'Choko', 'food_choko', 12, 6),
    FOOD_CHUNK: createFoodItem('food_chunk', 'Pedaço de Carne', 'food_chunk', 16),
    FOOD_CHUNK_ROTTEN: createFoodItem('food_chunk_rotten', 'Pedaço Apodrecido', 'food_chunk_rotten', 4),
    FOOD_FRUIT: createFoodItem('food_fruit', 'Fruta', 'food_fruit', 14, 6),
    FOOD_GRAPE: createFoodItem('food_grape', 'Uva', 'food_grape', 12, 6),
    FOOD_HONEYCOMB: createFoodItem('food_honeycomb', 'Favo de Mel', 'food_honeycomb', 20, 6),
    FOOD_LEMON: createFoodItem('food_lemon', 'Lima da Selva', 'food_lemon', 14, 10),
    FOOD_LUMP_OF_ROYAL_JELLY: createFoodItem('food_lump_of_royal_jelly', 'Geleia Real', 'food_lump_of_royal_jelly', 40, 12),
    FOOD_LYCHEE: createFoodItem('food_lychee', 'Lichia', 'food_lychee', 14, 8),
    FOOD_MEAT_RATION: createFoodItem('food_meat_ration', 'Ração de Carne', 'food_meat_ration', 32),
    FOOD_ORANGE: createFoodItem('food_orange', 'Laranja Selvagem', 'food_orange', 16, 10),
    FOOD_PEAR: createFoodItem('food_pear', 'Pera', 'food_pear', 16, 8),
    FOOD_PIECE_OF_AMBROSIA: createFoodItem('food_piece_of_ambrosia', 'Pedaço de Ambrosia', 'food_piece_of_ambrosia', 45, 12),
    FOOD_PIZZA: createFoodItem('food_pizza', 'Pizza Recheada', 'food_pizza', 38, 10),
    FOOD_RAMBUTAN: createFoodItem('food_rambutan', 'Rambutã', 'food_rambutan', 14, 8),
    FOOD_SAUSAGE: createFoodItem('food_sausage', 'Linguiça', 'food_sausage', 28),
    FOOD_SNOZZCUMBER: createFoodItem('food_snozzcumber', 'Snozzcumber', 'food_snozzcumber', 16, 10),
    FOOD_STRAWBERRY: createFoodItem('food_strawberry', 'Morango', 'food_strawberry', 12, 6),
    FOOD_SULTANA: createFoodItem('food_sultana', 'Sultana', 'food_sultana', 14, 6),
    DRINK_WATER_FLASK: createFoodItem('drink_water_flask', 'Cantil de Água Fresca', 'potion_cloudy', 4, 32),
    DRINK_SWEET_TEA: createFoodItem('drink_sweet_tea', 'Chá Doce Encantado', 'potion_bubbly', 6, 26),
    DRINK_STOUT_ALE: createFoodItem('drink_stout_ale', 'Ale Forjado', 'potion_golden', 8, 20),
    POTION_VIGOR: createPotionItem('potion_vigor', 'Poção de Vigor', 'potion_bubbly', { speed: 0.06, damage: 2, throwSpeed: 0.06, jump: 0.05 }, 12, { hunger: 6, thirst: 12 }),
    POTION_IRON_TOTEM: createPotionItem('potion_iron_totem', 'Poção do Totem de Ferro', 'potion_golden', { damage: 5, maxHP: 50 }, 10, { hunger: 10, thirst: 6 }),
    POTION_RESTORATIVE: createPotionItem('potion_restorative', 'Tônico Restaurador', 'potion_cloudy', { regen: 0.18, speed: 0.02 }, 12, { hunger: 4, thirst: 8 }),
    POTION_STEADFAST: createPotionItem('potion_steadfast', 'Poção de Estabilidade', 'potion_cloudy', { damage: 3, speed: 0.03, damageReduction: 2 }, 9, { hunger: 8 }),
    POTION_BERSERK: createPotionItem('potion_berserk', 'Poção do Berserker', 'potion_bubbly', { damage: 8, speed: 0.05 }, 10, { hunger: 12, thirst: 12 }),
    POTION_LEAP: createPotionItem('potion_leap', 'Poção do Salto Alto', 'potion_cloudy', { jump: 0.12, speed: 0.02 }, 12, { hunger: 8, thirst: 10 }),
    POTION_STONESKIN: createPotionItem('potion_stoneskin', 'Poção de Pele de Pedra', 'potion_golden', { regen: 0.22, damageReduction: 2 }, 14, { hunger: 6, thirst: 6 }),
    POTION_EFFERVESCENT: createPotionItem('potion_effervescent', 'Poção Efervescente', 'potion_effervescent', { speed: 0.1, throwStrength: 2, throwSpeed: 0.07 }, 12, { hunger: 8, thirst: 14 }),
    POTION_MURKY: createPotionItem('potion_murky', 'Tônico Obscuro', 'potion_murky', { regen: 0.15, damageReduction: 3 }, 10, { hunger: 6, thirst: 8 }),
    POTION_SAVAGE_HEAT: createPotionItem('potion_puce', 'Poção do Calor Selvagem', 'potion_puce', { damage: 6, speed: 0.04 }, 10, { hunger: 10, thirst: 10 }),
    SCROLL_FIRE_BURST: createScrollItem('scroll_fire_burst', 'Pergaminho da Fúria Ígnea', 'scroll_red', { damage: 6, speed: 0.03, throwSpeed: 0.05 }, 12),
    SCROLL_HEALING_WAVE: createScrollItem('scroll_healing_wave', 'Pergaminho da Maré Curativa', 'scroll_blue', { regen: 0.22 }, 10),
    SCROLL_SWIFT_STRIKE: createScrollItem('scroll_swift_strike', 'Pergaminho do Golpe Ágil', 'scroll_green', { speed: 0.12, jump: 0.04 }, 10),
    SCROLL_STONE_GUARD: createScrollItem('scroll_stone_guard', 'Pergaminho da Guarda de Pedra', 'scroll_grey', { damageReduction: 4, regen: 0.12 }, 12),
    BOOK_STONE_MIGHT: createPermanentItem('book_stone_might', 'Livro: Força de Pedra', 'book_red', { maxHP: 160, damage: 4, damageReduction: 2 }),
    BOOK_ARCANE_FOCUS: createPermanentItem('book_arcane_focus', 'Livro: Disciplina Arcana', 'book_blue', { regen: 0.08, speed: 0.03, throwSpeed: 0.04 }),
    BOOK_SWIFT_STRIDE: createPermanentItem('book_swift_stride', 'Livro: Passos Velozes', 'book_cyan', { speed: 0.08, jump: 0.06 }),
    BOOK_BERSERK_RAGE: createPermanentItem('book_berserk_rage', 'Livro: Fúria Berserker', 'book_gold', { damage: 6, throwStrength: 3, maxHP: 40 }),
    BOOK_WIND_CALL: createPermanentItem('book_wind_call', 'Livro: Chamado do Vento', 'book_magenta', { speed: 0.07, throwSpeed: 0.06, jump: 0.04 }),
    ELIXIR_VITALITY: createPermanentItem('elixir_vitality', 'Elixir de Vitalidade', 'potion_golden', { maxHP: 120 }, { hunger: 10, thirst: 8 }),
    ELIXIR_FEROCITY: createPermanentItem('elixir_ferocity', 'Elixir da Ferocidade', 'potion_bubbly', { damage: 6, damageReduction: 2 }),
    ELIXIR_WINDS: createPermanentItem('elixir_winds', 'Elixir dos Ventos', 'potion_cloudy', { speed: 0.05, jump: 0.05, throwSpeed: 0.05 }),
    ELIXIR_RESOLVE: createPermanentItem('elixir_resolve', 'Elixir da Determinação', 'potion_golden', { regen: 0.08 }),
    ELIXIR_STRENGTH: createPermanentItem('elixir_strength', 'Elixir da Força Gravitacional', 'potion_purple_red', { throwStrength: 4, damage: 4 }),
    ELIXIR_BALANCE: createPermanentItem('elixir_balance', 'Elixir do Equilíbrio', 'potion_sky_blue', { hungerDecay: -0.006, thirstDecay: -0.005 }),
    PERMA_STAMINA_SERUM: createPermanentItem('potion_stamina_serum', 'Soro de Estômagos', 'potion_golden', { maxHunger: 15 }, { hunger: 12, thirst: 4 }),
    PERMA_SEAWARD_TONIC: createPermanentItem('potion_seaward_tonic', 'Tônico Marinho', 'potion_cloudy', { maxThirst: 12 }, { thirst: 18 })
};
