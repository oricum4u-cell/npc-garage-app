
import React, { useState, useMemo } from 'react';
import { Estimate, EstimateStatus, Mechanic, StockItem } from '../types.ts';
import { getAiReportSummary } from '../services/geminiService.ts';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';

interface AdvancedReportsProps {
    estimates: Estimate[];
    mechanics: Mechanic[];
    stockItems: StockItem[];
}

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

const Tooltip: React.FC<{ content: string; x: number; y: number; }> = ({ content, x, y }) => {
    if (x === 0 && y === 0) return null;
    return (
        <div 
            className="absolute bg-gray-900 text-white text-xs rounded py-1 px-2 pointer-events-none transition-opacity duration-200 z-10"
            style={{ left: x, top: y, transform: 'translate(-50%, -110%)' }}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
};

const MonthlyRevenueChart: React.FC<{ estimates: Estimate[], formatCurrency: (value: number) => string, language: string }> = ({ estimates, formatCurrency, language }) => {
    const { t } = useLanguage();
    const data = useMemo(() => {
        const revenues = new Map<string, number>();
        const today = new Date();
        
        for(let i = 11; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = date.toLocaleString(language, { month: 'short', year: '2-digit' });
            revenues.set(key, 0);
        }

        estimates.forEach(e => {
            if (e.status === EstimateStatus.COMPLETED) {
                const date = new Date(e.date);
                const key = date.toLocaleString(language, { month: 'short', year: '2-digit' });
                if (revenues.has(key)) {
                    // Calculate Net Revenue (after discount)
                    const grossParts = e.parts.reduce((sum, p) => sum + p.quantity * p.price, 0);
                    const grossLabor = e.labor.reduce((sum, l) => sum + l.hours * l.rate, 0);
                    
                    const netParts = grossParts * (1 - (e.partsDiscount || 0) / 100);
                    const netLabor = grossLabor * (1 - (e.laborDiscount || 0) / 100);

                    revenues.set(key, (revenues.get(key) || 0) + netParts + netLabor);
                }
            }
        });

        return Array.from(revenues.entries()).map(([label, value]) => ({ label, value }));
    }, [estimates, language]);

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const chartHeight = 200;
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);

    return (
        <HudPanel title={`${t('reports.monthlyRevenueTitle')} (Net)`}>
            <div className="relative">
                {tooltip && <Tooltip {...tooltip} />}
                <svg width="100%" height={chartHeight + 30} preserveAspectRatio="xMidYMid meet">
                    <g>
                        {data.map((d, i) => {
                            const barHeight = d.value > 0 ? (d.value / maxValue) * chartHeight : 0;
                            const x = (i / data.length) * 100;
                            const barWidth = (1 / data.length) * 100 * 0.7; // 70% of available space
                            const y = chartHeight - barHeight;
                            
                            return (
                                <g key={i} 
                                   onMouseMove={(e) => {
                                       const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                       if(svgRect) {
                                          setTooltip({ content: `<strong>${d.label}</strong><br/>${formatCurrency(d.value)}`, x: e.clientX - svgRect.left, y: e.clientY - svgRect.top - 10 })
                                       }
                                   }}
                                   onMouseLeave={() => setTooltip(null)}
                                >
                                    <rect 
                                        x={`${x}%`}
                                        y={y}
                                        width={`${barWidth}%`} 
                                        height={barHeight}
                                        className="fill-current text-primary-500 hover:text-primary-600 transition-colors"
                                    />
                                    <text x={`${x + barWidth / 2}%`} y={chartHeight + 20} textAnchor="middle" className="text-xs fill-current text-gray-500 dark:text-gray-400">{d.label}</text>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>
        </HudPanel>
    );
};

const MechanicPerformanceTable: React.FC<{ 
    filteredEstimates: Estimate[], 
    mechanics: Mechanic[], 
    mechanicMap: Map<string, string>, 
    formatCurrency: (value: number) => string,
    t: (key: string) => string
}> = ({ filteredEstimates, mechanics, mechanicMap, formatCurrency, t }) => {
    const performanceData = useMemo(() => {
        const data = new Map<string, { totalLaborRevenue: number, totalHours: number, completedEstimates: Set<string> }>();
        mechanics.forEach(m => data.set(m.id, { totalLaborRevenue: 0, totalHours: 0, completedEstimates: new Set() }));

        filteredEstimates.forEach(e => {
            const assignedMechanics = e.mechanicIds || [];
            if (assignedMechanics.length > 0) {
                // Calculate Net Labor Revenue
                const grossLabor = e.labor.reduce((sum, l) => sum + l.hours * l.rate, 0);
                const netLabor = grossLabor * (1 - (e.laborDiscount || 0) / 100);
                const totalHours = e.labor.reduce((sum, l) => sum + l.hours, 0);
                
                const revenuePerMechanic = netLabor / assignedMechanics.length;
                const hoursPerMechanic = totalHours / assignedMechanics.length;

                assignedMechanics.forEach(mechId => {
                    if (data.has(mechId)) {
                        const current = data.get(mechId)!;
                        current.totalLaborRevenue += revenuePerMechanic;
                        current.totalHours += hoursPerMechanic;
                        current.completedEstimates.add(e.id);
                    }
                });
            }
        });

        return Array.from(data.entries())
            .map(([id, stats]) => ({
                id,
                name: mechanicMap.get(id) || 'N/A',
                totalLaborRevenue: stats.totalLaborRevenue,
                totalHours: stats.totalHours,
                completedEstimatesCount: stats.completedEstimates.size,
                avgHourlyRate: stats.totalHours > 0 ? stats.totalLaborRevenue / stats.totalHours : 0,
            }))
            .sort((a, b) => b.totalLaborRevenue - a.totalLaborRevenue);
    }, [filteredEstimates, mechanics, mechanicMap]);

    return (
        <HudPanel title={`${t('reports.mechanicsPerformanceTitle')} (Net)`}>
            <div className="overflow-x-auto">
                <table className="w-full text-left futuristic-table">
                    <thead>
                        <tr>
                            <th className="p-3">{t('reports.mechanicName')}</th>
                            <th className="p-3 text-right">Venit Manoperă (Net)</th>
                            <th className="p-3 text-right">Ore Lucrate</th>
                            <th className="p-3 text-right">Devize Participat</th>
                            <th className="p-3 text-right">Rată Orară Medie</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {performanceData.map(mech => (
                            <tr key={mech.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{mech.name}</td>
                                <td className="p-3 text-right font-semibold text-primary-600 dark:text-primary-400">{formatCurrency(mech.totalLaborRevenue)}</td>
                                <td className="p-3 text-right text-gray-700 dark:text-gray-300">{mech.totalHours.toFixed(1)}</td>
                                <td className="p-3 text-right text-gray-700 dark:text-gray-300">{mech.completedEstimatesCount}</td>
                                <td className="p-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(mech.avgHourlyRate)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {performanceData.length === 0 && <p className="text-center py-4 text-gray-500">{t('reports.noDataForMechanic')}</p>}
            </div>
        </HudPanel>
    );
};


const AdvancedReports: React.FC<AdvancedReportsProps> = ({ estimates, mechanics, stockItems }) => {
    const { t, language } = useLanguage();
    const { garageInfo } = useGarage();
    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));

    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [mechanicFilter, setMechanicFilter] = useState<'ALL' | string>('ALL');
    
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    
    const formatCurrency = (value: number) => {
        const locale = language === 'en' ? 'en-US' : 'ro-RO';
        const currencyCode = garageInfo.currency || 'RON';

        try {
            return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
        } catch (error) {
            console.error("Currency formatting error:", error);
            return `${value.toFixed(2)} ${currencyCode}`;
        }
    };

    const mechanicMap = useMemo(() => new Map(mechanics.map(m => [m.id, m.name])), [mechanics]);
    const stockPriceMap = useMemo(() => new Map(stockItems.map(item => [item.id, item.price])), [stockItems]);

    const filteredEstimates = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return estimates.filter(e => {
            const estimateDate = new Date(e.date);
            const matchesDate = estimateDate >= start && estimateDate <= end;
            const matchesStatus = e.status === EstimateStatus.COMPLETED;
            const matchesMechanic = mechanicFilter === 'ALL' || e.mechanicIds?.includes(mechanicFilter);
            return matchesDate && matchesStatus && matchesMechanic;
        });
    }, [estimates, startDate, endDate, mechanicFilter]);
    
    const { kpis, clientInsights, partsVsLaborData, topServicesData, topPartsData } = useMemo(() => {
        let totalRevenue = 0;
        let totalPartsRevenue = 0;
        let totalLaborRevenue = 0;
        let totalCostOfGoods = 0;
        let totalDiscountsGiven = 0;

        const serviceProfit = new Map<string, number>();
        const partProfit = new Map<string, { profit: number; count: number }>();
        
        filteredEstimates.forEach(e => {
            const grossParts = e.parts.reduce((s, p) => s + p.quantity * p.price, 0);
            const grossLabor = e.labor.reduce((s, l) => s + l.hours * l.rate, 0);
            
            const netParts = grossParts * (1 - (e.partsDiscount || 0) / 100);
            const netLabor = grossLabor * (1 - (e.laborDiscount || 0) / 100);
            
            totalPartsRevenue += netParts;
            totalLaborRevenue += netLabor;
            totalRevenue += netParts + netLabor;
            
            totalDiscountsGiven += (grossParts - netParts) + (grossLabor - netLabor);

            const estimatePartsCost = e.parts.reduce((cost, p) => {
                const purchasePrice = stockPriceMap.get(p.stockId || '');
                return cost + (purchasePrice !== undefined ? p.quantity * purchasePrice : 0);
            }, 0);
            totalCostOfGoods += estimatePartsCost;

            e.labor.forEach(l => {
                const itemGross = l.hours * l.rate;
                const itemNet = itemGross * (1 - (e.laborDiscount || 0) / 100);
                serviceProfit.set(l.description, (serviceProfit.get(l.description) || 0) + itemNet);
            });

            e.parts.forEach(p => {
                const purchasePrice = stockPriceMap.get(p.stockId || '');
                if (typeof purchasePrice === 'number') {
                    const itemGross = p.price * p.quantity;
                    const itemNet = itemGross * (1 - (e.partsDiscount || 0) / 100);
                    const profit = itemNet - (purchasePrice * p.quantity);
                    
                    const current = partProfit.get(p.name) || { profit: 0, count: 0 };
                    partProfit.set(p.name, {
                        profit: current.profit + profit,
                        count: current.count + p.quantity,
                    });
                }
            });
        });
        
        const totalProfit = (totalPartsRevenue - totalCostOfGoods) + totalLaborRevenue;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const totalCompleted = filteredEstimates.length;
        const averageRevenue = totalCompleted > 0 ? totalRevenue / totalCompleted : 0;

        const kpisData = { 
            totalRevenue, totalParts: totalPartsRevenue, totalLabor: totalLaborRevenue,
            totalCompleted, averageRevenue, totalProfit, profitMargin, totalDiscountsGiven
        };

        const allClients = new Map<string, Date>();
        estimates.forEach(e => {
            const clientKey = e.customerPhone || e.customerEmail || e.customerName;
            if (!clientKey) return;
            const estimateDate = new Date(e.date);
            if (!allClients.has(clientKey) || estimateDate < allClients.get(clientKey)!) {
                allClients.set(clientKey, estimateDate);
            }
        });

        const clientsInPeriod = new Set<string>();
        filteredEstimates.forEach(e => {
            const clientKey = e.customerPhone || e.customerEmail || e.customerName;
            if (clientKey) clientsInPeriod.add(clientKey);
        });

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        let newClientsCount = 0;
        clientsInPeriod.forEach(clientKey => {
            const firstDate = allClients.get(clientKey);
            if (firstDate && firstDate >= start && firstDate <= end) { newClientsCount++; }
        });
        const clientInsightsData = {
            totalClients: allClients.size,
            newClients: newClientsCount,
            recurringClients: clientsInPeriod.size - newClientsCount,
        };
        
        const pVlData = {
            parts: { value: totalPartsRevenue, percent: totalRevenue > 0 ? (totalPartsRevenue / totalRevenue) * 100 : 0 },
            labor: { value: totalLaborRevenue, percent: totalRevenue > 0 ? (totalLaborRevenue / totalRevenue) * 100 : 0 },
        };
        
        const topSrvData = [...serviceProfit.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        
        const topPrtData = [...partProfit.entries()]
            .map(([name, data]) => [name, data.profit] as [string, number])
            .filter(([, profit]) => profit > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);


        return { kpis: kpisData, clientInsights: clientInsightsData, partsVsLaborData: pVlData, topServicesData: topSrvData, topPartsData: topPrtData };
    }, [filteredEstimates, estimates, startDate, endDate, stockPriceMap]);

    const handleAiSummary = async () => {
        setIsAiModalOpen(true); setIsAiLoading(true); setAiSummary('');
        const reportData = { 
            period: `de la ${startDate} la ${endDate}`, 
            mechanic: mechanicFilter === 'ALL' ? 'Toți' : mechanicMap.get(mechanicFilter),
            financialKpis: {
                ...kpis,
                totalRevenue: formatCurrency(kpis.totalRevenue),
                totalProfit: formatCurrency(kpis.totalProfit),
                profitMargin: `${kpis.profitMargin.toFixed(1)}%`,
                averageRevenue: formatCurrency(kpis.averageRevenue),
            }, 
            clientInsights,
            topProfitableServices: topServicesData.map(([label, profit]) => ({ service: label, profit: formatCurrency(profit) })),
            topProfitableParts: topPartsData.map(([label, profit]) => ({ part: label, profit: formatCurrency(profit) }))
        };
        try { const result = await getAiReportSummary(reportData); setAiSummary(result); } 
        catch (error) { setAiSummary(error instanceof Error ? error.message : "A apărut o eroare necunoscută."); } 
        finally { setIsAiLoading(false); }
    };

    const KpiCard = ({ title, value, subtext, className = '', colorClass = 'text-primary-400' }: { title: string; value: string; subtext?: string, className?: string, colorClass?: string }) => (<div className={`bg-gray-950/50 p-6 rounded-lg text-center border border-gray-800 ${className}`}><h3 className="text-lg font-semibold text-gray-300">{title}</h3><p className={`text-4xl font-bold mt-2 ${colorClass}`}>{value}</p>{subtext && <p className="text-sm text-gray-400 mt-1">{subtext}</p>}</div>);
    const BarChart = ({ data, title, formatFn, className = '' }: { data: [string, number][], title: string, formatFn?: (val: number) => string, className?: string }) => {
        const maxValue = Math.max(...data.map(([, value]) => value), 1);
        return (<HudPanel title={title} className={className}><div className="space-y-4">{data.map(([label, value], index) => (<div key={index} className="flex items-center gap-4"><span className="w-1/3 truncate text-sm font-medium text-gray-300" title={label}>{label}</span><div className="w-2/3 bg-gray-950/70 rounded-full h-6"><div className="bg-primary-500 h-6 rounded-full flex items-center justify-end px-2 text-white text-sm font-bold" style={{ width: `${(value / maxValue) * 100}%` }}>{formatFn ? formatFn(value) : value.toFixed(0)}</div></div></div>))}</div></HudPanel>);
    };
    const DonutChart = ({ data, title, className = '' }: { data: { parts: { value: number, percent: number }, labor: { value: number, percent: number }}, title: string, className?: string }) => {
        const radius = 80; const circumference = 2 * Math.PI * radius; const laborOffset = circumference * (1 - data.labor.percent / 100);
        return (<HudPanel title={title} className={className}><div className="flex flex-col md:flex-row items-center gap-6"><svg width="200" height="200" viewBox="0 0 200 200"><circle r={radius} cx="100" cy="100" fill="transparent" strokeWidth="25" className="stroke-current text-sky-500" /><circle r={radius} cx="100" cy="100" fill="transparent" className="stroke-current text-amber-500" strokeWidth="25" strokeDasharray={circumference} strokeDashoffset={laborOffset} transform="rotate(-90 100 100)" /><text x="100" y="105" textAnchor="middle" className="text-2xl font-bold fill-current text-white">{formatCurrency(data.parts.value + data.labor.value)}</text><text x="100" y="125" textAnchor="middle" className="text-sm fill-current text-gray-400">Total Net</text></svg><ul className="space-y-2"><li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-sky-500"></span><span className="text-sm text-gray-300">Manoperă: <strong>{formatCurrency(data.labor.value)}</strong> ({data.labor.percent.toFixed(1)}%)</span></li><li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span><span className="text-sm text-gray-300">Piese: <strong>{formatCurrency(data.parts.value)}</strong> ({data.parts.percent.toFixed(1)}%)</span></li></ul></div></HudPanel>);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <HudPanel title={t('reports.title')}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                     <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 futuristic-input" />
                        <span className="text-gray-400">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 futuristic-input" />
                         <select id="mechanic-filter" value={mechanicFilter} onChange={e => setMechanicFilter(e.target.value)} className="p-2 futuristic-select">
                            <option value="ALL">{t('reports.allMechanics')}</option>
                            {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                </div>
            </HudPanel>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title={t('reports.totalRevenue')} value={formatCurrency(kpis.totalRevenue)} subtext="Calculat după reduceri" />
                <KpiCard title={t('reports.totalProfit')} value={formatCurrency(kpis.totalProfit)} colorClass="text-green-400" />
                <KpiCard title={t('reports.profitMargin')} value={`${kpis.profitMargin.toFixed(1)}%`} colorClass="text-green-400" />
                <KpiCard title={t('reports.completedEstimates')} value={kpis.totalCompleted.toString()} />
            </div>

            <MonthlyRevenueChart estimates={estimates} formatCurrency={formatCurrency} language={language} />
            
            <HudPanel title="Consilier de Afaceri AI" className="border-sky-500/30">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="flex-grow text-sky-300/80">Obțineți o analiză detaliată a performanței afacerii și recomandări acționabile, generate de inteligența artificială pe baza datelor din perioada selectată.</p>
                    <button onClick={handleAiSummary} disabled={isAiLoading} className="bg-sky-600/50 text-sky-200 font-bold py-3 px-6 rounded-lg transition-all duration-200 border-2 border-sky-500/80 hover:bg-sky-500/70 hover:border-sky-500/100 flex items-center justify-center gap-2 flex-shrink-0">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15v4a1 1 0 001 1h12a1 1 0 001-1v-4a1 1 0 00-.293-.707L16 11.586V8a6 6 0 00-6-6zM8 17a1 1 0 112 0v-1a1 1 0 11-2 0v1zm4-13a4 4 0 00-3.416 5.876L8 11.586V14h4v-2.414l.584-.584A4 4 0 0012 4z" /></svg>
                        {t('reports.aiSummaryButton')}
                    </button>
                </div>
            </HudPanel>
            
            <MechanicPerformanceTable filteredEstimates={filteredEstimates} mechanics={mechanics} mechanicMap={mechanicMap} formatCurrency={formatCurrency} t={t} />

            <HudPanel title={t('reports.clientInsightsTitle')}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KpiCard title={t('reports.totalClients')} value={clientInsights.totalClients.toString()} />
                    <KpiCard title={t('reports.newClients')} value={clientInsights.newClients.toString()} subtext={t('reports.inPeriod')} />
                    <KpiCard title={t('reports.recurringClients')} value={clientInsights.recurringClients.toString()} subtext={t('reports.inPeriod')} />
                </div>
            </HudPanel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <DonutChart data={partsVsLaborData} title={t('reports.revenueChartTitle')} />
                <BarChart data={topPartsData} title={t('reports.topProfitablePartsTitle')} formatFn={(v) => formatCurrency(v)} />
                <BarChart data={topServicesData} title={t('reports.topProfitableServicesTitle')} formatFn={(v) => formatCurrency(v)} className="lg:col-span-2" />
            </div>
            
             {filteredEstimates.length === 0 && (<HudPanel title="Date insuficiente"><p className="text-center py-10 text-gray-400">{t('reports.noDataForRange')}</p></HudPanel>)}
             
            {isAiModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setIsAiModalOpen(false)}>
                    <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-3xl animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <header className="p-4 border-b border-primary-900/50 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">{t('reports.aiSummaryTitle')}</h3>
                            <button onClick={() => setIsAiModalOpen(false)} className="p-1 rounded-full text-gray-400 hover:bg-gray-700">&times;</button>
                        </header>
                        <main className="flex-grow p-6 space-y-4 overflow-y-auto">{isAiLoading ? (<div className="flex flex-col items-center justify-center h-48"><div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-gray-300">{t('reports.aiLoadingSummary')}</p></div>) : (<MarkdownRenderer content={aiSummary} />)}</main>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedReports;