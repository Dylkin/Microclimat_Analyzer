import { EquipmentSection, EquipmentCard, CreateEquipmentSectionData, UpdateEquipmentSectionData, CreateEquipmentCardData, UpdateEquipmentCardData } from '../types/EquipmentSections';

// Базовый URL берём из переменных окружения VITE_API_URL или VITE_API_BASE_URL.
// По умолчанию используем '/api', чтобы в продакшене работать через Nginx reverse proxy,
// а не ходить на localhost:3001 из браузера пользователя.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api';

class EquipmentSectionsService {
  // Разделы оборудования
  async getSections(search?: string): Promise<EquipmentSection[]> {
    let url = `${API_BASE_URL}/equipment-sections`;
    if (search) {
      url += `?search=${encodeURIComponent(search)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Ошибка получения разделов оборудования');
    }
    
    const data = await response.json();
    return data.sections.map((section: any) => ({
      ...section,
      createdAt: new Date(section.createdAt),
      updatedAt: new Date(section.updatedAt)
    }));
  }

  async getSection(id: string): Promise<EquipmentSection> {
    const response = await fetch(`${API_BASE_URL}/equipment-sections/${id}`);
    if (!response.ok) {
      throw new Error('Ошибка получения раздела оборудования');
    }
    
    const section = await response.json();
    return {
      ...section,
      createdAt: new Date(section.createdAt),
      updatedAt: new Date(section.updatedAt)
    };
  }

  async createSection(data: CreateEquipmentSectionData): Promise<EquipmentSection> {
    const response = await fetch(`${API_BASE_URL}/equipment-sections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка создания раздела оборудования');
    }
    
    const section = await response.json();
    return {
      ...section,
      createdAt: new Date(section.createdAt),
      updatedAt: new Date(section.updatedAt)
    };
  }

  async updateSection(id: string, data: UpdateEquipmentSectionData): Promise<EquipmentSection> {
    const response = await fetch(`${API_BASE_URL}/equipment-sections/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка обновления раздела оборудования');
    }
    
    const section = await response.json();
    return {
      ...section,
      createdAt: new Date(section.createdAt),
      updatedAt: new Date(section.updatedAt)
    };
  }

  async deleteSection(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/equipment-sections/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка удаления раздела оборудования');
    }
  }

  // Карточки оборудования
  async getCards(search?: string, sectionId?: string): Promise<EquipmentCard[]> {
    let url = `${API_BASE_URL}/equipment-cards`;
    const params: string[] = [];
    if (search) {
      params.push(`search=${encodeURIComponent(search)}`);
    }
    if (sectionId) {
      params.push(`sectionId=${encodeURIComponent(sectionId)}`);
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Ошибка получения карточек оборудования');
    }
    
    const data = await response.json();
    return data.cards.map((card: any) => ({
      ...card,
      createdAt: new Date(card.createdAt),
      updatedAt: new Date(card.updatedAt)
    }));
  }

  async getCard(id: string): Promise<EquipmentCard> {
    const response = await fetch(`${API_BASE_URL}/equipment-cards/${id}`);
    if (!response.ok) {
      throw new Error('Ошибка получения карточки оборудования');
    }
    
    const card = await response.json();
    return {
      ...card,
      createdAt: new Date(card.createdAt),
      updatedAt: new Date(card.updatedAt)
    };
  }

  async createCard(data: CreateEquipmentCardData): Promise<EquipmentCard> {
    const response = await fetch(`${API_BASE_URL}/equipment-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка создания карточки оборудования');
    }
    
    const card = await response.json();
    return {
      ...card,
      createdAt: new Date(card.createdAt),
      updatedAt: new Date(card.updatedAt)
    };
  }

  async updateCard(id: string, data: UpdateEquipmentCardData): Promise<EquipmentCard> {
    const response = await fetch(`${API_BASE_URL}/equipment-cards/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка обновления карточки оборудования');
    }
    
    const card = await response.json();
    return {
      ...card,
      createdAt: new Date(card.createdAt),
      updatedAt: new Date(card.updatedAt)
    };
  }

  async deleteCard(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/equipment-cards/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка удаления карточки оборудования');
    }
  }
}

export const equipmentSectionsService = new EquipmentSectionsService();



