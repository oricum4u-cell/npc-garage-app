
export enum UserRole {
    ADMIN = 'ADMIN',
    MECHANIC = 'MECHANIC',
    USER = 'USER',
}

export interface NotificationPreferences {
    email: boolean;
    sms: boolean;
    browser: boolean;
    marketing: boolean;
}

export interface User {
    id: string;
    username: string;
    email?: string;
    password: string; 
    role: UserRole;
    lastLogin?: string;
    profilePicture?: string;
    failedLoginAttempts?: number;
    lockoutUntil?: string | null;
    notificationPreferences?: NotificationPreferences;
}

export interface UserSession {
    userId: string;
    username: string;
    role: string;
    ip: string;
    deviceType: string;
    deviceOS: string;
    lastActive: string;
    status: 'ONLINE' | 'OFFLINE';
    syncSource: string;
}

export enum EstimateStatus {
    DRAFT = 'DRAFT',
    AWAITING_PAYMENT = 'AWAITING_PAYMENT',
    COMPLETED = 'COMPLETED',
}

export interface Part {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    price: number;
    stockId?: string;
}

export interface Labor {
    id: string;
    description: string;
    hours: number;
    rate: number;
    observations?: string;
}

export type ChecklistItemStatus = 'OK' | 'ATTENTION' | 'NA';

export interface InspectionChecklist {
    [key: string]: ChecklistItemStatus;
}

export interface InspectionData {
    clientObservations: string;
    estheticStateNotes: string;
    checklist: InspectionChecklist;
    images?: string[];
}

export interface Payment {
    id: string;
    date: string;
    amount: number;
    method: 'CARD' | 'CASH' | 'TRANSFER';
    notes?: string;
}

export interface RepairLogEntry {
    timestamp: string;
    type: 'text' | 'image';
    content: string;
}

export interface TimeLog {
    id: string;
    mechanicId: string;
    mechanicName: string;
    startTime: string;
    endTime?: string;
    durationMinutes: number;
    notes?: string;
    isManual?: boolean;
}

export interface Estimate {
    id: string;
    estimateNumber: string;
    date: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    motorcycleMake: string;
    motorcycleModel: string;
    motorcycleYear: number;
    motorcycleVin: string;
    mileageIn?: number;
    services: string;
    parts: Part[];
    labor: Labor[];
    status: EstimateStatus;
    mechanicIds?: string[];
    partsDiscount?: number;
    laborDiscount?: number;
    discountReason?: string;
    promotionId?: string;
    inspection?: InspectionData;
    feedbackId?: string;
    payments?: Payment[];
    repairLog?: RepairLogEntry[];
    timeLogs?: TimeLog[];
    beforePhotos?: string[]; // Added
    afterPhotos?: string[];  // Added
}

export interface PredefinedLabor {
    id: string;
    description: string;
    rate: number;
}

export interface StockItem {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    supplier: string;
    lowStockThreshold: number;
    category?: string;
    location?: string;
}

export interface Mechanic {
    id: string;
    name: string;
    specialization?: string;
    experience?: 'JUNIOR' | 'SENIOR' | 'MASTER';
}

export interface Appointment {
    id: string;
    date: string;
    time: string;
    customerName: string;
    motorcycle: string;
    description: string;
    mechanicId?: string;
    status: 'Programat' | 'Finalizat' | 'Anulat';
}

export enum LoyaltyTier {
    BRONZE = 'BRONZE',
    SILVER = 'SILVER',
    GOLD = 'GOLD',
    PLATINUM = 'PLATINUM',
    VETERAN = 'VETERAN',
    STAFF = 'STAFF',
}

export interface LoyaltyTierConfig {
    points: number;
    laborDiscount: number;
    partsDiscount: number;
}

export interface LoyaltyConfig {
    POINTS_PER_RON: number;
    TIERS: Record<LoyaltyTier, LoyaltyTierConfig>;
}

export interface Client {
    name: string;
    phone: string;
    email: string;
    totalSpent: number;
    estimates: Estimate[];
    loyaltyPoints: number;
    loyaltyTier: LoyaltyTier;
}

export interface ClientDocument {
    id: string;
    type: 'RCA' | 'ITP' | 'TALON' | 'PERMIS' | 'OTHER';
    name: string;
    expiryDate?: string;
    imageBase64: string;
}

export interface DaySchedule {
    isOpen: boolean;
    start: string;
    end: string;
}

export type LogoVariant = 'default' | 'rpm' | 'wings' | 'hex' | 'shield';

export interface GarageInfo {
    name: string;
    address: string;
    phone: string;
    email: string;
    schedule: Record<string, DaySchedule>;
    termsAndConditions: string;
    currency: string;
    customLogo?: string;
    logoVariant?: LogoVariant;
    currencyPosition: 'before' | 'after';
    estimateNumberPrefix: string;
    estimateNumberStart: number;
    defaultLaborRate: number;
    defaultPartsMarkup?: number;
}


export enum PromotionType {
    PARTS_PERCENTAGE = 'PARTS_PERCENTAGE',
    LABOR_PERCENTAGE = 'LABOR_PERCENTAGE',
    FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export interface Promotion {
    id: string;
    name: string;
    description: string;
    type: PromotionType;
    value: number;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
}

export interface Recall {
    campaignNumber: string;
    date: string;
    component: string;
    summary: string;
}

export interface JobKitPart {
    name: string;
    description?: string;
    quantity: number;
    price: number;
}

export interface JobKitLabor {
    description: string;
    hours: number;
    rate: number;
    observations?: string;
}
export interface JobKit {
    id: string;
    name: string;
    description: string;
    parts: JobKitPart[];
    labor: JobKitLabor[];
}

export type BayStatus = 'ACTIVE' | 'WAITING' | 'PROBLEM';

export interface WorkshopBay {
    id: string;
    name: string;
    estimateId: string | null;
    status: BayStatus;
}

export interface AIPartSuggestion {
    partName: string;
    sku: string;
    supplier: string;
    estimatedPrice: number;
}
export interface AIPartSuggestionFromImage {
    partName: string;
    reasoning: string;
    estimatedPrice: number;
}
export interface AIPromotionSuggestion {
    name: string;
    description: string;
    type: PromotionType;
    value: number;
}
export interface AIPriceSuggestion {
    suggestedRate: number;
    reasoning: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}
export interface AITechnicalData {
    oilType: string;
    oilQuantityWithFilter: string;
    oilQuantityWithoutFilter: string;
    sparkPlugs: string;
    airFilter: string;
    oilFilter: string;
    coolantType: string;
    coolantQuantity: string;
}
export interface AIPrediction {
    componentName: string;
    recommendation: string;
    reasoning: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}
export interface AILaborSuggestion {
    description: string;
    rate: number;
}

export interface Supplier {
    id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    website?: string;
}

export enum OrderStatus {
    PLACED = 'PLACED',
    SHIPPED = 'SHIPPED',
    RECEIVED = 'RECEIVED',
    CANCELLED = 'CANCELLED'
}
export interface OrderItem {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
}
export interface PurchaseOrder {
    id: string;
    orderNumber: string;
    date: string;
    supplierId: string;
    items: OrderItem[];
    status: OrderStatus;
    notes?: string;
}

export interface AIReorderSuggestionItem {
    sku: string;
    name: string;
    quantity: number;
    reason: string;
}

export interface AIReorderSuggestion {
    supplierId: string;
    items: AIReorderSuggestionItem[];
}

export interface Feedback {
    id: string;
    estimateId: string;
    rating: number;
    comment: string;
    isPublic: boolean;
    date: string;
}

export interface AIFeedbackAnalysis {
    sentiment: 'POZITIV' | 'NEUTRU' | 'NEGATIV';
    keyTopics: string[];
}

export enum ServiceRequestStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
}

export interface ServiceRequest {
    id: string;
    clientName: string;
    clientPhone: string;
    motorcycleMake: string;
    motorcycleModel: string;
    motorcycleYear: number;
    motorcycleVin?: string;
    selectedServices: string[];
    clientObservations: string;
    status: ServiceRequestStatus;
    requestDate: string;
}

export enum DamageDossierStatus {
    DRAFT = 'DRAFT',
    SUBMITTED = 'SUBMITTED',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export interface PhotoAnnotation {
    x: number;
    y: number;
    description: string;
}

export interface DamageDossier {
    id: string;
    dossierNumber: string;
    estimateId: string;
    insuranceCompany: string;
    claimNumber: string;
    dateOfIncident: string;
    status: DamageDossierStatus;
    photoAnnotations: Record<string, PhotoAnnotation[]>;
    damageDescription: string;
}

export interface AIMarketingCampaign {
    title: string;
    targetAudienceDescription: string;
    targetClientPhones: string[];
    aiRationale: string;
    proposedSms: string;
}

export interface AIDamageAnnotation {
    x: number;
    y: number;
    description: string;
}

export interface AIDamageAnnotationResponseItem {
    imageIndex: number;
    annotations: AIDamageAnnotation[];
}

export interface MotoModel {
    id: string;
    make: string;
    model: string;
    year: number;
}

export interface PartFitment {
    id: string;
    partSku: string;
    partName: string;
    category: string;
    motoModelId: string;
    isOem: boolean;
    notes?: string;
}

export interface DetailingService {
    id: string;
    name: string;
    price: number;
    description: string;
}

export interface DetailingJob {
    id: string;
    clientName: string;
    motorcycle: string;
    package: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    notes?: string;
    date: string;
}

export interface StorageContactLog {
    date: string;
    method: 'PHONE' | 'SMS' | 'EMAIL' | 'LETTER';
    notes: string;
}

export interface StorageEntry {
    id: string;
    clientName: string;
    phone: string;
    motorcycle: string;
    startDate: string;
    dailyFee: number;
    status: 'ACTIVE' | 'ABANDONED' | 'RETURNED';
    contactLog: StorageContactLog[];
}

export type TransportType = 'PICKUP' | 'DELIVERY';
export type TransportStatus = 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface TransportRequest {
    id: string;
    clientName: string;
    phone: string;
    address: string;
    motorcycle: string;
    type: TransportType;
    status: TransportStatus;
    scheduledDate: string;
    scheduledTime: string;
    driverId?: string;
    notes?: string;
    cost: number;
}
