export type PetType = 'cat' | 'dog' | 'rabbit' | 'bird' | 'other';

export interface Pet {
  id: string;
  name: string;            // Кличка (напр., «Барсик»)
  type: PetType;           // Вид животного
  breed?: string;          // Порода (напр., «Британская вислоухая»)
  color: string;           // Цвет диапазона (hex, напр., '#FFB4A2')
  textColor?: string;      // Цвет текста для контрастности
  avatar: string;          // Эмодзи питомца (🐱, 🐶, 🐰 и т.д.)
  notes?: string;          // Привычки, рацион, аллергии
}

export interface Owner {
  name: string;            // Имя владельца (напр., «Екатерина»)
  phone: string;           // Телефон (+7...)
  telegram?: string;       // @username или телефон
  whatsapp?: string;       // Номер для WA
  address?: string;        // Адрес (если нужен забор)
  notes?: string;          // Пожелания хозяина
}

export interface Booking {
  id: string;
  petId: string;           // Связь с питомцем
  startDate: string;       // 'YYYY-MM-DD'
  endDate: string;         // 'YYYY-MM-DD'
  dailyRate: number;       // Стоимость в сутки (руб.)
  totalAmount: number;     // Общая сумма
  prepayment: number;      // Внесенная предоплата (руб.)
  isPaidInFull: boolean;   // Полностью ли рассчитались
  owner: Owner;
  notes?: string;          // Особые отметки по данной брони
  createdAt: string;
}

export interface CalendarDayBooking {
  booking: Booking;
  pet: Pet;
  isStart: boolean;
  isEnd: boolean;
  isMiddle: boolean;
  rowSlot: number;         // Вертикальный слот для аккуратного наложения полосок
}

export interface CalendarDay {
  date: Date;
  dateString: string;      // 'YYYY-MM-DD'
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  booking?: Booking;
  pet?: Pet;
  isStart?: boolean;
  isEnd?: boolean;
}

export interface ReleaseInfo {
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
  apkDownloadUrl?: string;
  apkName?: string;
  hasUpdate: boolean;
}
