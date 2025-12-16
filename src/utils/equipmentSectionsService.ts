import { EquipmentSection, EquipmentCard, CreateEquipmentSectionData, UpdateEquipmentSectionData, CreateEquipmentCardData, UpdateEquipmentCardData } from '../types/EquipmentSections';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class EquipmentSectionsService {
  // Разделы оборудования
  async getSections(search?: string): Promise<EquipmentSection[]> {
    const url = new URL(`${API_BASE_URL}/api/equipment-sections`);
    if (search) {
      url.searchParams.append('search', search);
    }
    
    const response = await fetch(url.toString());
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
    const response = await fetch(`${API_BASE_URL}/api/equipment-sections/${id}`);
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
    const response = await fetch(`${API_BASE_URL}/api/equipment-sections`, {
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
    const response = await fetch(`${API_BASE_URL}/api/equipment-sections/${id}`, {
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
    const response = await fetch(`${API_BASE_URL}/api/equipment-sections/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка удаления раздела оборудования');
    }
  }

  // Карточки оборудования
  async getCards(search?: string, sectionId?: string): Promise<EquipmentCard[]> {
    const url = new URL(`${API_BASE_URL}/api/equipment-cards`);
    if (search) {
      url.searchParams.append('search', search);
    }
    if (sectionId) {
      url.searchParams.append('sectionId', sectionId);
    }
    
    const response = await fetch(url.toString());
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
    const response = await fetch(`${API_BASE_URL}/api/equipment-cards/${id}`);
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
    const response = await fetch(`${API_BASE_URL}/api/equipment-cards`, {
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
    const response = await fetch(`${API_BASE_URL}/api/equipment-cards/${id}`, {
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
    const response = await fetch(`${API_BASE_URL}/api/equipment-cards/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка удаления карточки оборудования');
    }
  }
}

export const equipmentSectionsService = new EquipmentSectionsService();



