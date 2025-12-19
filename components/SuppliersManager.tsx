import React, { useState, useMemo } from 'react';
import { Supplier, PurchaseOrder, StockItem, OrderStatus, OrderItem, Estimate, AIReorderSuggestion } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';
import { getOrderStatusKey } from '../utils/translationHelpers.ts';
import { ORDER_STATUS_COLORS } from '../constants.ts';
import AIReorderSuggestionsModal from './AIReorderSuggestionsModal.tsx';

// Props
interface SuppliersManagerProps {
    suppliers: Supplier[];
    setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
    purchaseOrders: PurchaseOrder[];
    setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
    stockItems: StockItem[];
    setStockItems: React.Dispatch<React.SetStateAction<StockItem[]>>;
    showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
    setIsAppLoading: (isLoading: boolean) => void;
    estimates: Estimate[];
}

// --- SUB-COMPONENTS (MODALS) ---

const SupplierModal: React.FC<{
    supplier: Supplier | null;
    onSave: (data: Omit<Supplier, 'id'>) => void;
    onClose: () => void;
}> = ({ supplier, onSave, onClose }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        name: supplier?.name || '',
        contactPerson: supplier?.contactPerson || '',
        phone: supplier?.phone || '',
        email: supplier?.email || '',
        website: supplier?.website || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <header className="p-4 border-b border-primary-900/50"><h3 className="text-xl font-bold text-white">{supplier ? 'Editare Furnizor' : t('suppliers.addSupplier')}</h3></header>
                    <main className="p-6 space-y-4">
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder={t('suppliers.supplierName')} required className="w-full p-2 futuristic-input" />
                        <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} placeholder={t('suppliers.contactPerson')} className="w-full p-2 futuristic-input" />
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder={t('suppliers.phone')} className="w-full p-2 futuristic-input" />
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder={t('suppliers.email')} className="w-full p-2 futuristic-input" />
                        <input type="text" name="website" value={formData.website} onChange={handleChange} placeholder={t('suppliers.website')} className="w-full p-2 futuristic-input" />
                    </main>
                    <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl"><button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">Anulează</button><button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg">Salvează</button></footer>
                </form>
            </div>
        </div>
    );
};

const OrderModal: React.FC<{
    order: PurchaseOrder | null;
    suppliers: Supplier[];
    onSave: (data: Omit<PurchaseOrder, 'id' | 'orderNumber'>) => void;
    onClose: () => void;
}> = ({ order, suppliers, onSave, onClose }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        date: order?.date || new Date().toISOString().split('T')[0],
        supplierId: order?.supplierId || '',
        items: order?.items || [],
        status: order?.status || OrderStatus.PLACED,
        notes: order?.notes || '',
    });

    const handleAddItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, { id: `new-${Date.now()}`, name: '', sku: '', quantity: 1, price: 0 }] }));
    const handleRemoveItem = (index: number) => setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
        const newItems = [...formData.items];
        (newItems[index] as any)[field] = (field === 'quantity' || field === 'price') ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, items: newItems }));
    };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (formData.supplierId && formData.items.length > 0) onSave(formData); };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="contents">
                    <header className="p-4 border-b border-primary-900/50"><h3 className="text-xl font-bold text-white">{order ? t('suppliers.editOrderTitle') : t('suppliers.newOrderTitle')}</h3></header>
                    <main className="p-6 space-y-4 overflow-y-auto">
                        <select name="supplierId" value={formData.supplierId} onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))} required className="w-full p-2 futuristic-select"><option value="">{t('suppliers.selectSupplier')}</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                        <textarea name="notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder={t('suppliers.orderNotes')} rows={2} className="w-full p-2 futuristic-input"></textarea>
                        <div>
                            <h4 className="font-medium text-gray-300 mb-2">{t('suppliers.orderItems')}</h4>
                            <div className="space-y-2">{formData.items.map((item, index) => (<div key={index} className="grid grid-cols-[1fr,100px,80px,80px,auto] items-end gap-2 p-2 bg-gray-800 rounded"><input type="text" value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} placeholder={t('suppliers.itemName')} required className="p-1 futuristic-input" /><input type="text" value={item.sku} onChange={(e) => handleItemChange(index, 'sku', e.target.value)} placeholder={t('suppliers.itemSku')} required className="p-1 futuristic-input" /><input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} min="1" placeholder={t('suppliers.itemQty')} className="p-1 futuristic-input" /><input type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} step="0.01" min="0" placeholder={t('suppliers.itemPrice')} className="p-1 futuristic-input" /><button type="button" onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-300 p-1">🗑️</button></div>))}</div>
                            <button type="button" onClick={handleAddItem} className="mt-2 text-sm text-blue-400 hover:text-blue-300 font-semibold">{t('suppliers.addItem')}</button>
                        </div>
                    </main>
                    <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl"><button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">Anulează</button><button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg">{t('suppliers.saveOrder')}</button></footer>
                </form>
            </div>
        </div>
    );
};

const StatusUpdateModal: React.FC<{
    order: PurchaseOrder | null;
    onUpdate: (orderId: string, status: OrderStatus) => void;
    onClose: () => void;
}> = ({ order, onUpdate, onClose }) => {
    const { t } = useLanguage();
    const [newStatus, setNewStatus] = useState(order?.status || OrderStatus.PLACED);
    if (!order) return null;
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-primary-900/50"><h3 className="text-xl font-bold text-white">{t('suppliers.changeStatus')} - {order.orderNumber}</h3></header>
                <main className="p-6"><select value={newStatus} onChange={e => setNewStatus(e.target.value as OrderStatus)} className="w-full p-2 futuristic-select">{Object.values(OrderStatus).map(s => <option key={s} value={s}>{t(getOrderStatusKey(s))}</option>)}</select></main>
                <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl"><button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">Anulează</button><button type="button" onClick={() => onUpdate(order.id, newStatus)} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg">{t('suppliers.updateStatus')}</button></footer>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const HudPanel: React.FC<{ title: string, children: React.ReactNode, className?: string, titleClassName?: string }> = ({ title, children, className, titleClassName }) => (
    <div className={`relative w-full p-6 bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl shadow-2xl shadow-primary-900/50 ${className}`}>
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary-500/80 rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary-500/80 rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary-500/80 rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary-500/80 rounded-br-xl"></div>
        <h2 className={`text-xl font-bold text-white mb-6 border-b-2 border-primary-500/20 pb-4 ${titleClassName}`}>{title}</h2>
        {children}
    </div>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${active ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'}`}>{children}</button>
);

const SuppliersManager: React.FC<SuppliersManagerProps> = ({ suppliers, setSuppliers, purchaseOrders, setPurchaseOrders, stockItems, setStockItems, showNotification, setIsAppLoading, estimates }) => {
    const { t } = useLanguage();
    const { garageInfo } = useGarage();
    const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');

    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [orderToUpdateStatus, setOrderToUpdateStatus] = useState<PurchaseOrder | null>(null);
    const [isAiReorderModalOpen, setIsAiReorderModalOpen] = useState(false);

    const handleOpenSupplierModal = (supplier: Supplier | null) => {
        setEditingSupplier(supplier);
        setIsSupplierModalOpen(true);
    };

    const handleSaveSupplier = (formData: Omit<Supplier, 'id'>) => {
        setIsAppLoading(true);
        setTimeout(() => {
            if (editingSupplier) {
                setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...formData } : s));
                showNotification(t('suppliers.notificationSupplierUpdated'), 'success');
            } else {
                setSuppliers(prev => [...prev, { id: `supp-${Date.now()}`, ...formData }]);
                showNotification(t('suppliers.notificationSupplierAdded'), 'success');
            }
            setIsSupplierModalOpen(false);
            setEditingSupplier(null);
            setIsAppLoading(false);
        }, 500);
    };
    
    const handleDeleteSupplier = (id: string) => {
        if (window.confirm(t('suppliers.confirmDeleteSupplier'))) {
            setSuppliers(prev => prev.filter(s => s.id !== id));
            showNotification(t('suppliers.notificationSupplierDeleted'), 'info');
        }
    };

    const handleSaveOrder = (orderData: Omit<PurchaseOrder, 'id' | 'orderNumber'>) => {
        setIsAppLoading(true);
        setTimeout(() => {
            if (editingOrder) {
                setPurchaseOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, ...orderData } : o));
                showNotification(t('suppliers.notificationOrderUpdated'));
            } else {
                const orderNumber = `CMD-${(purchaseOrders.length + 1).toString().padStart(4, '0')}`;
                setPurchaseOrders(prev => [...prev, { id: `po-${Date.now()}`, ...orderData, orderNumber, status: OrderStatus.PLACED }]);
                showNotification(t('suppliers.notificationOrderAdded'));
            }
            setIsOrderModalOpen(false);
            setEditingOrder(null);
            setIsAppLoading(false);
        }, 500);
    };
    
    const handleDeleteOrder = (id: string) => {
        if (window.confirm('Sunteți sigur că doriți să ștergeți această comandă?')) {
            setPurchaseOrders(prev => prev.filter(o => o.id !== id));
            showNotification('Comanda a fost ștearsă.');
        }
    };

    const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
        setPurchaseOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        setIsStatusModalOpen(false);
    };

    const handleAddOrderToStock = (order: PurchaseOrder) => {
        if (order.status !== OrderStatus.RECEIVED) return;
        setIsAppLoading(true);
        setTimeout(() => {
            let updatedStock = [...stockItems];
            order.items.forEach(item => {
                const existingStockItemIndex = updatedStock.findIndex(si => si.sku.toLowerCase() === item.sku.toLowerCase());
                if (existingStockItemIndex > -1) {
                    updatedStock[existingStockItemIndex].quantity += item.quantity;
                } else {
                    const supplier = suppliers.find(s => s.id === order.supplierId);
                    updatedStock.push({
                        id: `si-${Date.now()}-${item.sku}`,
                        name: item.name,
                        sku: item.sku,
                        quantity: item.quantity,
                        price: item.price * 1.3,
                        supplier: supplier?.name || 'N/A',
                        lowStockThreshold: 5,
                    });
                }
            });
            setStockItems(updatedStock);
            showNotification(t('suppliers.stockAdded'), 'success');
            setIsAppLoading(false);
        }, 500);
    };

    const handleCreateOrdersFromSuggestions = (suggestedOrders: AIReorderSuggestion[]) => {
        setIsAppLoading(true);
        setTimeout(() => {
            const newOrders: PurchaseOrder[] = suggestedOrders.map(suggestion => {
                const orderNumber = `CMD-${(purchaseOrders.length + 1 + Math.random()).toString().substring(2, 6).toUpperCase()}`;
                return {
                    id: `po-${Date.now()}-${suggestion.supplierId}`,
                    orderNumber,
                    date: new Date().toISOString().split('T')[0],
                    supplierId: suggestion.supplierId,
                    items: suggestion.items.map(item => ({
                        id: `new-${Date.now()}-${item.sku}`,
                        name: item.name,
                        sku: item.sku,
                        quantity: item.quantity,
                        price: 0 // Price needs to be filled in by supplier
                    })),
                    status: OrderStatus.PLACED,
                    notes: `Generat de Asistentul AI. Motive: ${suggestion.items.map(i => i.reason).join('; ')}`
                };
            });

            setPurchaseOrders(prev => [...prev, ...newOrders]);
            setIsAiReorderModalOpen(false);
            showNotification(`${newOrders.length} comenzi noi au fost create.`, 'success');
            setIsAppLoading(false);
        }, 500);
    };
    
    return (
        <>
            {isSupplierModalOpen && <SupplierModal supplier={editingSupplier} onSave={handleSaveSupplier} onClose={() => setIsSupplierModalOpen(false)} />}
            {isOrderModalOpen && <OrderModal order={editingOrder} suppliers={suppliers} onSave={handleSaveOrder} onClose={() => setIsOrderModalOpen(false)} />}
            {isStatusModalOpen && <StatusUpdateModal order={orderToUpdateStatus} onUpdate={handleUpdateOrderStatus} onClose={() => setIsStatusModalOpen(false)} />}
            {isAiReorderModalOpen && (
                <AIReorderSuggestionsModal 
                    stockItems={stockItems}
                    estimates={estimates}
                    suppliers={suppliers}
                    onClose={() => setIsAiReorderModalOpen(false)}
                    onCreateOrders={handleCreateOrdersFromSuggestions}
                />
            )}

            <div className="space-y-6">
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white">{t('suppliers.title')}</h1>
                    <div className="p-1 bg-gray-200 dark:bg-gray-900 rounded-lg flex items-center">
                        <TabButton active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')}>{t('suppliers.suppliersTab')}</TabButton>
                        <TabButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')}>{t('suppliers.ordersTab')}</TabButton>
                    </div>
                </div>

                {activeTab === 'suppliers' && (
                    <HudPanel title={t('suppliers.suppliersTab')} className="animate-fade-in">
                        <div className="flex justify-end mb-4"><button onClick={() => handleOpenSupplierModal(null)} className="bg-primary-600/50 text-primary-200 font-bold py-2 px-4 rounded-lg flex items-center gap-2">{t('suppliers.addSupplier')}</button></div>
                         {suppliers.map(s => (
                            <div key={s.id} className="p-4 bg-gray-950/50 rounded-lg mb-3 flex flex-col sm:flex-row justify-between sm:items-center">
                                <div><p className="font-bold text-lg text-white">{s.name}</p><p className="text-sm text-gray-400">{s.contactPerson}</p><p className="text-sm text-gray-400">{s.phone} | {s.email}</p></div>
                                <div className="flex gap-2 mt-2 sm:mt-0"><button onClick={() => handleOpenSupplierModal(s)}>✏️</button><button onClick={() => handleDeleteSupplier(s.id)}>🗑️</button></div>
                            </div>
                        ))}
                    </HudPanel>
                )}

                {activeTab === 'orders' && (
                     <HudPanel title={t('suppliers.ordersTab')} className="animate-fade-in">
                        <div className="flex justify-end mb-4 gap-4">
                            <button onClick={() => setIsAiReorderModalOpen(true)} className="bg-sky-500/30 text-sky-200 font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15v4a1 1 0 001 1h12a1 1 0 001-1v-4a1 1 0 00-.293-.707L16 11.586V8a6 6 0 00-6-6zM8 17a1 1 0 112 0v-1a1 1 0 11-2 0v1zm4-13a4 4 0 00-3.416 5.876L8 11.586V14h4v-2.414l.584-.584A4 4 0 0012 4z" /></svg>
                                {t('suppliers.aiSmartOrder')}
                            </button>
                            <button onClick={() => { setEditingOrder(null); setIsOrderModalOpen(true); }} className="bg-primary-600/50 text-primary-200 font-bold py-2 px-4 rounded-lg flex items-center gap-2">{t('suppliers.newOrder')}</button>
                        </div>
                        {purchaseOrders.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => {
                            const supplierName = suppliers.find(s => s.id === order.supplierId)?.name || 'N/A';
                            const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                            return (
                                <div key={order.id} className="p-4 bg-gray-950/50 rounded-lg mb-3">
                                    <div className="flex justify-between items-start">
                                        <div><p className="font-bold text-lg text-primary-400">{order.orderNumber}</p><p className="text-white">{supplierName}</p><p className="text-sm text-gray-400">{new Date(order.date).toLocaleDateString()}</p></div>
                                        <div className="text-right"><span className={`px-2 py-1 text-xs font-bold rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>{t(getOrderStatusKey(order.status))}</span><p className="font-bold text-lg text-white mt-1">{total.toFixed(2)} {garageInfo.currency}</p></div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-primary-900/50">
                                        <ul className="text-xs text-gray-300 space-y-1">
                                            {order.items.map(item => (
                                                <li key={item.id} className="flex justify-between">
                                                    <span>{item.name} <span className="text-gray-400">(x{item.quantity})</span></span>
                                                    <span className="font-mono">{item.price > 0 ? (item.price * item.quantity).toFixed(2) : '-'}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                     <div className="flex justify-end gap-4 mt-2 border-t border-primary-900/50 pt-2">
                                        <button onClick={() => { setEditingOrder(order); setIsOrderModalOpen(true); }} className="text-xs text-amber-400 hover:text-amber-300 underline">{t('estimatesList.edit')}</button>
                                        <button onClick={() => { setOrderToUpdateStatus(order); setIsStatusModalOpen(true); }} className="text-xs text-cyan-400 hover:text-cyan-300 underline">{t('suppliers.changeStatus')}</button>
                                        {order.status === OrderStatus.RECEIVED && <button onClick={() => handleAddOrderToStock(order)} className="text-xs text-green-400 hover:text-green-300 underline">{t('suppliers.addToStock')}</button>}
                                        <button onClick={() => handleDeleteOrder(order.id)} className="text-xs text-red-400 hover:text-red-300 underline">{t('estimatesList.delete')}</button>
                                    </div>
                                </div>
                            )
                        })}
                    </HudPanel>
                )}
            </div>
        </>
    );
};

export default SuppliersManager;