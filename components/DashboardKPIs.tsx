import React, { useState, useMemo } from 'react';
import { Estimate, StockItem, EstimateStatus } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';

interface DashboardKPIsProps {
    estimates: Estimate[];
    stockItems: StockItem[];
}

type TimeRange = 'today' | 'week' | 'month';

const KpiCard: React.FC<{ icon: React.ReactNode; value: string; label: string; }> = ({ icon, value, label }) => (
    <div className="bg-gray-950/60 backdrop-blur-sm rounded-lg p-4 flex items-center gap-4 border border-white/5">
        <div className="p-3 bg-primary-900/50 rounded-full text-primary-300">
            {icon}
        </div>
        <div>
            <p className="text-2xl md:text-3xl font-bold text-white font-mono">{value}</p>
            <p className="text-sm text-gray-400">{label}</p>
        </div>
    </div>
);

const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ estimates, stockItems }) => {
    const { t, language } = useLanguage();
    const { garageInfo } = useGarage();
    const [timeRange, setTimeRange] = useState<TimeRange>('today');

    const stockPriceMap = useMemo(() => new Map(stockItems.map(item => [item.id, item.price])), [stockItems]);

    const formatCurrency = (value: number) => {
        const locale = language === 'en' ? 'en-US' : 'ro-RO';
        return new Intl.NumberFormat(locale, { style: 'currency', currency: garageInfo.currency, maximumFractionDigits: 0 }).format(value);
    };
    
    const kpis = useMemo(() => {
        const now = new Date();
        let startDate: Date;

        switch (timeRange) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                const firstDayOfWeek = new Date(now);
                const day = firstDayOfWeek.getDay() || 7; // getDay() returns 0 for Sunday
                if (day !== 1) firstDayOfWeek.setHours(-24 * (day - 1));
                firstDayOfWeek.setHours(0,0,0,0);
                startDate = firstDayOfWeek;
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }

        const relevantEstimates = estimates.filter(e => {
            const estimateDate = new Date(e.date);
            return e.status === EstimateStatus.COMPLETED && estimateDate >= startDate;
        });

        let totalRevenue = 0;
        let totalProfit = 0;

        for (const e of relevantEstimates) {
            const partsRevenue = e.parts.reduce((sum, p) => sum + p.price * p.quantity, 0);
            const laborRevenue = e.labor.reduce((sum, l) => sum + l.rate * l.hours, 0);
            
            totalRevenue += partsRevenue + laborRevenue;

            const partsCost = e.parts.reduce((cost, p) => {
                const purchasePrice = stockPriceMap.get(p.stockId || '');
                // Dacă piesa are un cost înregistrat în stoc, folosim (vânzare - achiziție) * cantitate.
                // Dacă nu, profitul din piesă e 0 (poate fi o piesă ad-hoc, unde prețul e deja marcat).
                return cost + (purchasePrice ? p.quantity * purchasePrice : p.quantity * p.price);
            }, 0);
            
            const estimateProfit = (partsRevenue - partsCost) + laborRevenue;
            totalProfit += estimateProfit;
        }

        const completedCount = relevantEstimates.length;
        const averageValue = completedCount > 0 ? totalRevenue / completedCount : 0;
        const averageProfit = completedCount > 0 ? totalProfit / completedCount : 0;

        // Calcul Clienți Noi
        const clientFirstVisit = new Map<string, Date>();
        const allEstimatesSorted = [...estimates].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const e of allEstimatesSorted) {
            const clientKey = e.customerPhone || e.customerEmail || e.customerName;
            if (clientKey && !clientFirstVisit.has(clientKey)) {
                clientFirstVisit.set(clientKey, new Date(e.date));
            }
        }

        const clientsInPeriod = new Set<string>();
        relevantEstimates.forEach(e => {
            const clientKey = e.customerPhone || e.customerEmail || e.customerName;
            if (clientKey) {
                clientsInPeriod.add(clientKey);
            }
        });

        let newClientsCount = 0;
        clientsInPeriod.forEach(clientKey => {
            const firstVisitDate = clientFirstVisit.get(clientKey);
            if (firstVisitDate && firstVisitDate >= startDate && firstVisitDate <= now) {
                newClientsCount++;
            }
        });

        return {
            totalRevenue: formatCurrency(totalRevenue),
            estimatedProfit: formatCurrency(totalProfit),
            completedEstimates: completedCount.toString(),
            averageValue: formatCurrency(averageValue),
            averageProfit: formatCurrency(averageProfit),
            newClients: newClientsCount.toString(),
        };

    }, [timeRange, estimates, stockPriceMap, garageInfo.currency, language]);

    const TabButton: React.FC<{ label: string; range: TimeRange }> = ({ label, range }) => (
        <button
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${timeRange === range ? 'bg-gray-700 text-primary-300' : 'text-gray-400 hover:bg-gray-800'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="relative w-full p-4 sm:p-6 bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl shadow-2xl shadow-primary-900/50 animate-fade-in-up">
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary-500/80 rounded-tl-xl"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary-500/80 rounded-tr-xl"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary-500/80 rounded-bl-xl"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary-500/80 rounded-br-xl"></div>

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">{t('kpi.title')}</h3>
                <div className="p-1 bg-gray-900 rounded-lg flex items-center">
                    <TabButton label={t('kpi.today')} range="today" />
                    <TabButton label={t('kpi.thisWeek')} range="week" />
                    <TabButton label={t('kpi.thisMonth')} range="month" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <KpiCard icon="💰" value={kpis.totalRevenue} label={t('kpi.totalRevenue')} />
                <KpiCard icon="📈" value={kpis.estimatedProfit} label={t('kpi.estimatedProfit')} />
                <KpiCard icon="✅" value={kpis.completedEstimates} label={t('kpi.completedEstimates')} />
                <KpiCard icon="📊" value={kpis.averageValue} label={t('kpi.averageValue')} />
                <KpiCard icon="💡" value={kpis.averageProfit} label={t('kpi.averageProfit')} />
                <KpiCard icon="👤" value={kpis.newClients} label={t('kpi.newClients')} />
            </div>
        </div>
    );
};

export default DashboardKPIs;
