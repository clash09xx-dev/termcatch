import type {
  User,
  Business,
  Employee,
  Service,
  Appointment,
  Review,
  Payment,
  CrmContact,
} from "@prisma/client";

// ── Re-exports with relations ──────────────────────────────────

export type AppointmentWithRelations = Appointment & {
  customer: Pick<User, "id" | "firstName" | "lastName" | "email" | "phone" | "avatarUrl">;
  business: Pick<Business, "id" | "name" | "slug" | "logoUrl" | "phone">;
  service: Pick<Service, "id" | "name" | "duration" | "price">;
  employee?: Pick<Employee, "id" | "firstName" | "lastName" | "color"> | null;
  payment?: Payment | null;
};

export type BusinessWithStats = Business & {
  _count: {
    appointments: number;
    reviews: number;
    employees: number;
  };
};

export type SearchResult = Pick<
  Business,
  | "id"
  | "slug"
  | "name"
  | "category"
  | "address"
  | "city"
  | "latitude"
  | "longitude"
  | "logoUrl"
  | "coverImageUrl"
  | "averageRating"
  | "totalReviews"
  | "totalBookings"
> & {
  distance?: number;
  nextAvailableSlot?: Date;
  isAvailableToday: boolean;
  isAvailableNow: boolean;
  minPrice?: number;
};

// ── Search & Filter types ─────────────────────────────────────

export type SearchFilters = {
  query?: string;
  city?: string;
  category?: string;
  availableToday?: boolean;
  availableNow?: boolean;
  date?: string; // ISO date
  time?: string; // HH:MM
  maxPrice?: number;
  minRating?: number;
  maxDistance?: number;
  employeeId?: string;
  sortBy?: "availability" | "rating" | "price_asc" | "price_desc" | "distance";
  page?: number;
  limit?: number;
};

export type SortOption = {
  value: SearchFilters["sortBy"];
  label: string;
};

// ── Booking flow ──────────────────────────────────────────────

export type BookingStep =
  | "service"
  | "employee"
  | "datetime"
  | "details"
  | "payment"
  | "confirmation";

export type BookingState = {
  businessId: string;
  serviceId?: string;
  employeeId?: string;
  date?: Date;
  timeSlot?: string; // "HH:MM"
  customerNotes?: string;
  couponCode?: string;
  giftCardCode?: string;
  paymentMethod?: string;
};

export type TimeSlot = {
  time: string; // "HH:MM"
  available: boolean;
  employeeId?: string;
};

// ── API response types ─────────────────────────────────────────

export type ApiSuccess<T> = {
  data: T;
  error: null;
};

export type ApiError = {
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Pagination ─────────────────────────────────────────────────

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

// ── Dashboard ──────────────────────────────────────────────────

export type DashboardStats = {
  todayAppointments: number;
  monthRevenue: number;
  noShowRate: number;
  averageRating: number;
  totalCustomers: number;
  newCustomersThisMonth: number;
};

export type RevenueDataPoint = {
  date: string;
  revenue: number;
  appointments: number;
};

// ── Notifications ──────────────────────────────────────────────

export type NotificationPayload = {
  to: string; // email or phone
  type: string;
  data: Record<string, unknown>;
};

// ── AI ─────────────────────────────────────────────────────────

export type AiMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
};

export type AiInsightType =
  | "forecast"
  | "pricing"
  | "marketing"
  | "retention"
  | "no_show";
