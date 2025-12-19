import React, { useState, useMemo } from 'react';
import { Estimate, EstimateStatus, User, UserRole, Mechanic } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';

interface ChartProps {
    estimates: Estimate[];
    user: Omit<User, 'password'> | null;
    mechanics: Mechanic[];
}

const HudPanel: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className }) => (
    <div className={`relative w-full h-full p-4 sm:p-6 bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl shadow-2xl shadow-primary-900/50 ${className}`}>
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary-500/80 rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary-500/80 rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary-500/80 rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary-500/80 rounded-br-xl"></div>
        {children}
    </div>
);

// Monthly Revenue Chart (Admin only)
const MonthlyRevenueChart: React.FC<{ estimates: Estimate[], language: string }> = ({ estimates, language }) => {
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
                    const total = e.parts.reduce((sum, p) => sum + p.price * p.quantity, 0) + e.labor.reduce((sum, l) => sum + l.rate * l.hours, 0);
                    revenues.set(key, (revenues.get(key) || 0) + total);
                }
            }
        });

        return Array.from(revenues.entries()).map(([label, value]) => ({ label, value }));
    }, [estimates, language]);

    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="space-y-2">
             <h3 className="text-lg font-bold text-white">{t('reports.monthlyRevenueTitle')}</h3>
            <div className="w-full h-40 bg-gray-950/50 rounded-lg p-2 flex items-end gap-1">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group relative">
                        <div 
                            className="w-full bg-primary-500/70 hover:bg-primary-500 rounded-t-sm transition-all"
                            style={{ height: `${(d.value / maxValue) * 100}%` }}
                        ></div>
                        <div className="absolute -top-6 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2">
                           {d.value.toFixed(0)}
                        </div>
                    </div>
                ))}
            </div>
            <div className="w-full flex text-xs text-gray-400">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 text-center">{d.label}</div>
                ))}
            </div>
        </div>
    );
};


// Status Distribution Donut Chart
const StatusDistributionChart: React.FC<{ estimates: Estimate[], title: string }> = ({ estimates, title }) => {
    const { t } = useLanguage();
    const data = useMemo(() => {
        const counts = new Map<EstimateStatus, number>();
        Object.values(EstimateStatus).forEach(status => counts.set(status, 0));
        
        estimates.forEach(e => {
            counts.set(e.status, (counts.get(e.status) || 0) + 1);
        });
        
        return Array.from(counts.entries())
            .map(([label, value]) => ({ label, value }))
            .filter(d => d.value > 0);
    }, [estimates]);

    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return null;

    const colors: Record<EstimateStatus, string> = {
        [EstimateStatus.DRAFT]: 'var(--color-primary-500)',
        [EstimateStatus.AWAITING_PAYMENT]: 'var(--color-blue-500)',
        [EstimateStatus.COMPLETED]: 'var(--color-green-500)',
    };
    
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    let accumulated = 0;

    return (
        <div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <div className="flex items-center gap-4">
                <svg width="120" height="120" viewBox="0 0 120 120" className="-m-2">
                    {data.map(d => {
                        const percent = d.value / total;
                        const dashoffset = circumference * (1 - accumulated);
                        accumulated += percent;
                        return (
                             <circle key={d.label} r={radius} cx="60" cy="60"
                                fill="transparent"
                                stroke={colors[d.label]}
                                strokeWidth="15"
                                strokeDasharray={`${circumference * percent} ${circumference * (1-percent)}`}
                                strokeDashoffset={dashoffset}
                                transform="rotate(-90 60 60)"
                            />
                        );
                    })}
                     <text x="60" y="65" textAnchor="middle" className="text-2xl font-bold fill-current text-white">{total}</text>
                </svg>
                <ul className="space-y-1">
                    {data.map(d => (
                         <li key={d.label} className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[d.label] }}></span>
                            <span className="text-gray-300">{t(`estimateStatus.${d.label}`)}: <strong>{d.value}</strong></span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// Mechanic Performance Chart (Admin only)
const MechanicPerformanceChart: React.FC<{ estimates: Estimate[], mechanics: Mechanic[] }> = ({ estimates, mechanics }) => {
    const { t } = useLanguage();
    const data = useMemo(() => {
        const mechanicLaborRevenue = new Map<string, number>();
        mechanics.forEach(m => mechanicLaborRevenue.set(m.id, 0));
        
        estimates.forEach(e => {
            if (e.status === EstimateStatus.COMPLETED) {
                const assignedMechanics = e.mechanicIds || [];
                if (assignedMechanics.length > 0) {
                    const totalLaborRevenue = e.labor.reduce((sum, l) => sum + l.hours * l.rate, 0);
                    const revenuePerMechanic = totalLaborRevenue / assignedMechanics.length;

                    assignedMechanics.forEach(mechId => {
                        if (mechanicLaborRevenue.has(mechId)) {
                            mechanicLaborRevenue.set(mechId, (mechanicLaborRevenue.get(mechId) || 0) + revenuePerMechanic);
                        }
                    });
                }
            }
        });

        const mechanicNameMap = new Map(mechanics.map(m => [m.id, m.name]));

        return Array.from(mechanicLaborRevenue.entries())
            .map(([id, revenue]) => ({
                name: mechanicNameMap.get(id) || 'Necunoscut',
                revenue
            }))
            .filter(d => d.revenue > 0)
            .sort((a, b) => b.revenue - a.revenue).slice(0, 4);

    }, [estimates, mechanics]);
    
    if (data.length === 0) return null;

    const maxValue = Math.max(...data.map(d => d.revenue), 1);

    return (
        <div>
            <h3 className="text-lg font-bold text-white mb-4">{t('reports.mechanicsPerformanceTitle')}</h3>
            <div className="space-y-3">
                {data.map((d, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm group">
                        <span className="w-24 truncate font-semibold text-gray-300" title={d.name}>{d.name}</span>
                        <div className="flex-grow bg-gray-950/70 rounded-full h-5 relative overflow-hidden">
                             <div 
                                className="bg-primary-500/80 h-5 rounded-full flex items-center justify-end px-2 text-white font-bold transition-all duration-500"
                                style={{ width: `${(d.revenue / maxValue) * 100}%` }}
                             >
                             </div>
                        </div>
                         <span className="w-20 text-right font-mono text-white">{d.revenue.toFixed(0)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Mechanic's personal workload chart (Mechanic only)
const MechanicWorkloadChart: React.FC<{ estimates: Estimate[], user: Omit<User, 'password'>, mechanics: Mechanic[] }> = ({ estimates, user, mechanics }) => {
    const { t } = useLanguage();
    const mechanicUser = useMemo(() => mechanics.find(m => m.name.toLowerCase() === user.username.toLowerCase()), [mechanics, user]);

    const data = useMemo(() => {
        if (!mechanicUser) return { completed: 0, inProgress: 0 };
        
        return estimates.reduce((acc, e) => {
            if (e.mechanicIds?.includes(mechanicUser.id)) {
                if (e.status === EstimateStatus.COMPLETED) {
                    acc.completed += 1;
                } else if (e.status === EstimateStatus.DRAFT) {
                    acc.inProgress += 1;
                }
            }
            return acc;
        }, { completed: 0, inProgress: 0 });

    }, [estimates, mechanicUser]);

    if (!mechanicUser) return null;
    
    return (
        <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">{t('reports.myTasks')}</h3>
            <div className="flex gap-4">
                 <div className="bg-gray-950/60 p-4 rounded-lg flex-1 text-center">
                    <p className="text-4xl font-bold text-primary-400">{data.inProgress}</p>
                    <p className="text-sm text-gray-300">{t('estimateStatus.DRAFT')}</p>
                 </div>
                  <div className="bg-gray-950/60 p-4 rounded-lg flex-1 text-center">
                    <p className="text-4xl font-bold text-green-400">{data.completed}</p>
                    <p className="text-sm text-gray-300">{t('estimateStatus.COMPLETED')}</p>
                 </div>
            </div>
        </div>
    );
}

const DashboardCharts: React.FC<ChartProps> = ({ estimates, user, mechanics }) => {
    const { t, language } = useLanguage();

    const estimatesThisMonth = useMemo(() => {
        const today = new Date();
        return estimates.filter(e => {
            const date = new Date(e.date);
            return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        });
    }, [estimates]);

    if (!user) return null;

    return (
        <HudPanel>
             <h2 className="text-xl font-bold text-white mb-6 border-b-2 border-primary-500/20 pb-4">{t('reports.dashboardCharts')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {user.role === UserRole.ADMIN ? (
                    <>
                        <MonthlyRevenueChart estimates={estimates} language={language} />
                        <StatusDistributionChart estimates={estimates} title={t('estimatesList.title')} />
                        <MechanicPerformanceChart estimates={estimates} mechanics={mechanics} />
                    </>
                ) : (
                    <>
                         <MechanicWorkloadChart estimates={estimates} user={user} mechanics={mechanics} />
                         <StatusDistributionChart estimates={estimatesThisMonth} title={t('reports.title')} />
                    </>
                )}
            </div>
        </HudPanel>
    );
};

export default DashboardCharts;