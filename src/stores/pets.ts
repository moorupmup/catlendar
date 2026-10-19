import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Pet } from '../types';

export const PASTEL_PET_COLORS = [
  { name: 'Персиковый', bg: '#FFD6A5', text: '#693B00' },
  { name: 'Лавандовый', bg: '#D8B4F8', text: '#4A156B' },
  { name: 'Мятный', bg: '#B7E4C7', text: '#15522E' },
  { name: 'Небесный', bg: '#A0C4FF', text: '#0A387E' },
  { name: 'Солнечный', bg: '#FFEAA7', text: '#6E5600' },
  { name: 'Розовая пудра', bg: '#FFB5C5', text: '#6D0B26' },
  { name: 'Коралловый', bg: '#FFB5A7', text: '#6E1D13' },
  { name: 'Фисташковый', bg: '#C7F9CC', text: '#1E5E26' },
  { name: 'Сиреневый', bg: '#E8AEB7', text: '#5C242E' },
  { name: 'Черничный', bg: '#CDB4DB', text: '#432657' },
];

const DEFAULT_PETS: Pet[] = [
  {
    id: 'pet-1',
    name: 'Персик',
    type: 'cat',
    breed: 'Рыжий шотландский',
    color: '#FFD6A5',
    textColor: '#693B00',
    avatar: '🐱',
    notes: 'Любит паштеты с кроликом, чесать за ушком утром.',
  },
  {
    id: 'pet-2',
    name: 'Луна',
    type: 'cat',
    breed: 'Британская шиншилла',
    color: '#D8B4F8',
    textColor: '#4A156B',
    avatar: '😸',
    notes: 'Спокойная, пуглива к резким звукам. Корм Royal Canin.',
  },
  {
    id: 'pet-3',
    name: 'Майло',
    type: 'dog',
    breed: 'Корги',
    color: '#B7E4C7',
    textColor: '#15522E',
    avatar: '🐶',
    notes: 'Выгул 3 раза в день, давать витаминки в 10:00.',
  },
  {
    id: 'pet-4',
    name: 'Зефирка',
    type: 'rabbit',
    breed: 'Карликовый баран',
    color: '#FFB5C5',
    textColor: '#6D0B26',
    avatar: '🐰',
    notes: 'Свежее сено всегда в доступе, любит сушеные яблочки.',
  }
];

export const usePetsStore = defineStore('pets', () => {
  const pets = ref<Pet[]>([]);

  // Load from LocalStorage or initialize with defaults
  function init() {
    const saved = localStorage.getItem('catlendar_pets');
    if (saved) {
      try {
        pets.value = JSON.parse(saved);
      } catch (e) {
        pets.value = DEFAULT_PETS;
      }
    } else {
      pets.value = DEFAULT_PETS;
      save();
    }
  }

  function save() {
    localStorage.setItem('catlendar_pets', JSON.stringify(pets.value));
  }

  function getPetById(id: string): Pet | undefined {
    return pets.value.find(p => p.id === id);
  }

  function addPet(petData: Omit<Pet, 'id'>): Pet {
    const newPet: Pet = {
      ...petData,
      id: `pet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    pets.value.push(newPet);
    save();
    return newPet;
  }

  function updatePet(id: string, updates: Partial<Pet>) {
    const idx = pets.value.findIndex(p => p.id === id);
    if (idx !== -1) {
      pets.value[idx] = { ...pets.value[idx], ...updates };
      save();
    }
  }

  function deletePet(id: string) {
    pets.value = pets.value.filter(p => p.id !== id);
    save();
  }

  // Get next available nice pastel color
  function getNextColor(): { bg: string; text: string } {
    const usedColors = new Set(pets.value.map(p => p.color));
    const available = PASTEL_PET_COLORS.find(c => !usedColors.has(c.bg));
    return available || PASTEL_PET_COLORS[pets.value.length % PASTEL_PET_COLORS.length];
  }

  init();

  return {
    pets,
    getPetById,
    addPet,
    updatePet,
    deletePet,
    getNextColor,
  };
});
