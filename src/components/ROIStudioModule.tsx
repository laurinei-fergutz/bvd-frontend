import { useEffect, useState } from 'react';

import {
  calculateRoi,
  downloadRoiCsv,
  downloadRoiXlsx,
  fetchSavedRoiAssumptions,
  saveRoiAssumptions,
  type AnalyzeProcessResponse,
  type ProcessGraphResponse,
  type RoiAssumptions,
  type RoiCalculationResult,
} from '../services/api';
import { formatDuration } from './ProcessGraph';
import { useSettings } from '../context/SettingsContext';
import {
  IconAlertTriangle,
  IconDollarSign,
  IconDocument,
  IconLock,
  IconSave,
  IconSpinner,
  IconTarget,
  IconTrendingUp,
} from './Icons';

const DEFAULT_ASSUMPTIONS: RoiAssumptions = {
  hourly_cost: 60,
  monthly_case_volume: 200,
  hours_per_month_per_fte: 160,
  legacy_license_monthly_cost: 0,
  ai_monthly_cost: 50,
  one_time_implementation_cost: 0,
  currency: 'BRL',
  avg_tokens_per_transaction: 1500,
  cost_per_million_tokens_small_model: 1.5,
  cost_per_million_tokens_advanced_model: 8,
  small_model_token_share_pct: 70,
  compute_overhead_pct: 20,
  discount_rate_pct: 12,
  time_horizon_years: 2,
  exception_rate_pct: 5,
  exception_handling_cost: 10,
  peak_monthly_case_volume: 0,
  peak_monthly_tco_estimate: 0,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '1.5rem',
};

const statGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: '1.25rem',
};

// Narrower, capped-width columns for assumption inputs - these hold a
// handful of digits each, so they shouldn't stretch to fill the card.
const inputGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 160px))',
  gap: '1.25rem 1.5rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '160px',
  padding: '0.4rem 0.55rem',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface-alt)',
  color: 'var(--text-primary)',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '0.8rem',
  display: 'block',
  marginBottom: '0.35rem',
  minHeight: '2.2em',
};

const buttonStyle: React.CSSProperties = {
  background: 'var(--bg-surface-alt)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.6rem 1.1rem',
  fontSize: '0.9rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
};

const sectionTitleStyle: React.CSSProperties = { marginTop: 0, marginBottom: '0.25rem' };
const sectionSubtitleStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  marginTop: 0,
  marginBottom: '1.25rem',
  fontSize: '0.85rem',
};

function formatCurrency(value: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}

function formatCurrencyPrecise(value: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 4 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(4)}`;
  }
}

type Field = { key: keyof RoiAssumptions; label: string; min?: number };

function NumberField({
  field,
  assumptions,
  onChange,
}: {
  field: Field;
  assumptions: RoiAssumptions;
  onChange: (field: keyof RoiAssumptions) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{field.label}</label>
      <input
        type="number"
        min={field.min ?? 0}
        value={assumptions[field.key] as number}
        onChange={onChange(field.key)}
        style={inputStyle}
      />
    </div>
  );
}

type Props = {
  graphData: ProcessGraphResponse | null;
  aiResult: AnalyzeProcessResponse | null;
  onCalculatedChange: (calculated: boolean) => void;
};

export default function ROIStudioModule({ graphData, aiResult, onCalculatedChange }: Props) {
  const { t, language } = useSettings();
  const [assumptions, setAssumptions] = useState<RoiAssumptions>(DEFAULT_ASSUMPTIONS);
  const [result, setResult] = useState<RoiCalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calculateError, setCalculateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  useEffect(() => {
    fetchSavedRoiAssumptions()
      .then((saved) => {
        if (saved) setAssumptions(saved);
      })
      .catch(() => {
        // No saved assumptions yet, or the DB isn't reachable - the form
        // just keeps its sensible defaults, no need to surface an error
        // for what is effectively a "first run" state.
      });
  }, []);

  useEffect(() => {
    setResult(null);
    setCalculateError('');
  }, [graphData, aiResult]);

  useEffect(() => {
    onCalculatedChange(result !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const updateField = (field: keyof RoiAssumptions) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = field === 'currency' ? e.target.value : Number(e.target.value);
    setAssumptions((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalculate = async () => {
    if (!graphData || !aiResult) return;

    setCalculating(true);
    setCalculateError('');
    try {
      const calculated = await calculateRoi(graphData, aiResult.insights, assumptions);
      setResult(calculated);
    } catch (err) {
      setCalculateError(err instanceof Error ? err.message : t('roi.calculateError'));
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveAssumptions = async () => {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');
    try {
      await saveRoiAssumptions(assumptions);
      setSaveMessage(t('roi.assumptionsSaved'));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('roi.assumptionsSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (!graphData || !aiResult) return;
    setExportError('');
    const setLoading = format === 'xlsx' ? setExportingXlsx : setExportingCsv;
    setLoading(true);
    try {
      if (format === 'xlsx') await downloadRoiXlsx(graphData, aiResult.insights, assumptions);
      else await downloadRoiCsv(graphData, aiResult.insights, assumptions);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : t('roi.exportError'));
    } finally {
      setLoading(false);
    }
  };

  if (!graphData || !aiResult) {
    return (
      <div>
        <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconDollarSign size={22} /> {t('roi.title')}
        </h2>
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border)',
            borderRadius: '10px',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <p
            style={{
              fontSize: '1.1rem',
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            <IconLock size={18} /> {t('roi.locked')}
          </p>
          <p style={{ margin: 0 }}>{t('roi.lockedMessage')}</p>
        </div>
      </div>
    );
  }

  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  const currentMonthlyCost = result ? result.hours_lost_per_case * assumptions.monthly_case_volume * assumptions.hourly_cost : 0;
  const projectedMonthlyCost = result ? currentMonthlyCost - result.monthly_labor_savings + result.monthly_tco : 0;
  const maxBarCost = Math.max(currentMonthlyCost, projectedMonthlyCost, 1);
  const maxCptCost = result ? Math.max(result.cost_per_transaction_manual, result.cost_per_transaction_automated, 0.0001) : 1;

  const operationalFields: Field[] = [
    { key: 'hourly_cost', label: t('roi.hourlyCost') },
    { key: 'monthly_case_volume', label: t('roi.monthlyCaseVolume') },
    { key: 'hours_per_month_per_fte', label: t('roi.hoursPerMonthPerFte'), min: 1 },
    { key: 'legacy_license_monthly_cost', label: t('roi.legacyLicenseCost') },
    { key: 'ai_monthly_cost', label: t('roi.aiMonthlyCost') },
    { key: 'one_time_implementation_cost', label: t('roi.implementationCost') },
  ];

  const unitEconomicsFields: Field[] = [
    { key: 'avg_tokens_per_transaction', label: t('roi.avgTokensPerTransaction') },
    { key: 'cost_per_million_tokens_small_model', label: t('roi.costPerMillionSmall') },
    { key: 'cost_per_million_tokens_advanced_model', label: t('roi.costPerMillionAdvanced') },
    { key: 'small_model_token_share_pct', label: t('roi.smallModelShare') },
    { key: 'compute_overhead_pct', label: t('roi.computeOverheadPct') },
  ];

  const advancedFinancialFields: Field[] = [
    { key: 'discount_rate_pct', label: t('roi.discountRate') },
    { key: 'time_horizon_years', label: t('roi.timeHorizon'), min: 1 },
  ];

  const riskFields: Field[] = [
    { key: 'exception_rate_pct', label: t('roi.exceptionRate') },
    { key: 'exception_handling_cost', label: t('roi.exceptionCost') },
    { key: 'peak_monthly_case_volume', label: t('roi.peakVolume') },
    { key: 'peak_monthly_tco_estimate', label: t('roi.peakTco') },
  ];

  return (
    <div>
      <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <IconDollarSign size={22} /> {t('roi.title')}
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>{t('roi.subtitle')}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
        <section style={cardStyle}>
          <h3 style={sectionTitleStyle}>{t('roi.assumptionsTitle')}</h3>
          <p style={sectionSubtitleStyle}>{t('roi.assumptionsSubtitle')}</p>
          <div style={inputGrid}>
            {operationalFields.map((field) => (
              <NumberField key={field.key} field={field} assumptions={assumptions} onChange={updateField} />
            ))}
            <div>
              <label style={labelStyle}>{t('roi.currency')}</label>
              <select value={assumptions.currency} onChange={updateField('currency')} style={inputStyle}>
                <option value="BRL">BRL (R$)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <h3 style={sectionTitleStyle}>{t('roi.section.unitEconomics')}</h3>
          <div style={inputGrid}>
            {unitEconomicsFields.map((field) => (
              <NumberField key={field.key} field={field} assumptions={assumptions} onChange={updateField} />
            ))}
          </div>
        </section>

        <section style={cardStyle}>
          <h3 style={sectionTitleStyle}>{t('roi.section.advancedFinancial')}</h3>
          <div style={inputGrid}>
            {advancedFinancialFields.map((field) => (
              <NumberField key={field.key} field={field} assumptions={assumptions} onChange={updateField} />
            ))}
          </div>
        </section>

        <section style={cardStyle}>
          <h3 style={sectionTitleStyle}>{t('roi.section.risk')}</h3>
          <div style={inputGrid}>
            {riskFields.map((field) => (
              <NumberField key={field.key} field={field} assumptions={assumptions} onChange={updateField} />
            ))}
          </div>
        </section>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={handleCalculate}
          disabled={calculating}
          style={{
            ...buttonStyle,
            background: calculating ? 'var(--muted)' : 'var(--accent-purple)',
            color: 'white',
            border: 'none',
            fontWeight: 'bold',
            cursor: calculating ? 'not-allowed' : 'pointer',
          }}
        >
          {calculating ? (
            <>
              <IconSpinner size={16} /> {t('roi.calculating')}
            </>
          ) : (
            <>
              <IconTrendingUp size={16} /> {t('roi.calculate')}
            </>
          )}
        </button>
        <button type="button" onClick={handleSaveAssumptions} disabled={saving} style={buttonStyle}>
          <IconSave size={15} /> {saving ? t('roi.savingAssumptions') : t('roi.saveAssumptions')}
        </button>
      </div>

      {saveMessage && <p style={{ color: 'var(--accent-green)', fontSize: '0.85rem', marginTop: '0.75rem' }}>{saveMessage}</p>}
      {saveError && <p style={{ color: 'var(--danger-light)', fontSize: '0.85rem', marginTop: '0.75rem' }}>{saveError}</p>}
      {calculateError && (
        <p style={{ color: 'var(--danger-light)', fontSize: '0.85rem', marginTop: '0.75rem' }}>{calculateError}</p>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
          <section>
            <h3 style={{ marginBottom: '1rem' }}>{t('roi.results')}</h3>
            <div style={{ ...statGrid, marginBottom: '1.25rem' }}>
              <StatCard label={t('roi.fteSaved')} value={result.monthly_fte_saved.toFixed(2)} />
              <StatCard
                label={t('roi.monthlyNetSavings')}
                value={formatCurrency(result.net_monthly_savings, result.currency, locale)}
              />
              <StatCard
                label={t('roi.annualNetSavings')}
                value={formatCurrency(result.net_annual_savings, result.currency, locale)}
              />
              <StatCard
                label={t('roi.roiPercentage')}
                value={result.roi_percentage != null ? `${result.roi_percentage.toFixed(0)}%` : t('roi.notApplicable')}
              />
            </div>
            <div style={statGrid}>
              <StatCard
                label={t('roi.basedOnBottleneckHours')}
                value={formatDuration(result.observed_bottleneck_hours * 3600)}
                hint={`${result.observed_cases} ${t('roi.observedCases')}`}
              />
              <StatCard
                label={t('roi.efficiencyFactor')}
                value={`${result.efficiency_factor_pct.toFixed(0)}%`}
                hint={result.efficiency_factor_estimated ? t('roi.efficiencyFactorEstimatedNote') : undefined}
              />
            </div>
          </section>

          <section style={cardStyle}>
            <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>{t('roi.costComparison')}</h4>
            <CostBar
              label={t('roi.currentCost')}
              value={currentMonthlyCost}
              max={maxBarCost}
              color="var(--danger-light)"
              display={formatCurrency(currentMonthlyCost, result.currency, locale)}
            />
            <CostBar
              label={t('roi.projectedCost')}
              value={projectedMonthlyCost}
              max={maxBarCost}
              color="var(--accent-green)"
              display={formatCurrency(projectedMonthlyCost, result.currency, locale)}
              last
            />
          </section>

          <section>
            <h3 style={{ marginBottom: '1rem' }}>{t('roi.results.unitEconomics')}</h3>
            <div style={{ ...statGrid, marginBottom: '1.25rem' }}>
              <StatCard
                label={t('roi.blendedTokenCost')}
                value={formatCurrencyPrecise(result.blended_cost_per_million_tokens, result.currency, locale)}
              />
              <StatCard
                label={t('roi.monthlyTokenCost')}
                value={formatCurrency(result.monthly_token_cost, result.currency, locale)}
              />
              <StatCard
                label={t('roi.monthlyInfraOverhead')}
                value={formatCurrency(result.monthly_infra_overhead_cost, result.currency, locale)}
              />
              <StatCard
                label={t('roi.monthlyAiRunningCost')}
                value={formatCurrency(result.monthly_ai_running_cost, result.currency, locale)}
              />
            </div>
            <div style={cardStyle}>
              <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>{t('roi.cptComparison')}</h4>
              <CostBar
                label={t('roi.cptManual')}
                value={result.cost_per_transaction_manual}
                max={maxCptCost}
                color="var(--danger-light)"
                display={formatCurrencyPrecise(result.cost_per_transaction_manual, result.currency, locale)}
              />
              <CostBar
                label={t('roi.cptAutomated')}
                value={result.cost_per_transaction_automated}
                max={maxCptCost}
                color="var(--accent-green)"
                display={formatCurrencyPrecise(result.cost_per_transaction_automated, result.currency, locale)}
                last
              />
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: '1rem' }}>{t('roi.results.advancedFinancial')}</h3>
            <div style={statGrid}>
              <StatCard
                label={t('roi.payback')}
                value={
                  result.payback_months != null ? `${result.payback_months.toFixed(1)} ${t('roi.months')}` : t('roi.notApplicable')
                }
              />
              <StatCard label={t('roi.npv')} value={result.npv != null ? formatCurrency(result.npv, result.currency, locale) : t('roi.notApplicable')} />
              <StatCard
                label={t('roi.irr')}
                value={result.irr_percentage != null ? `${result.irr_percentage.toFixed(0)}%` : t('roi.notApplicable')}
              />
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: '1rem' }}>{t('roi.results.risk')}</h3>
            <div style={statGrid}>
              <StatCard
                label={t('roi.exceptionCostMonthly')}
                value={formatCurrency(result.monthly_exception_cost, result.currency, locale)}
              />
              <StatCard
                label={t('roi.exceptionCostRatio')}
                value={
                  result.exception_cost_ratio_pct != null ? `${result.exception_cost_ratio_pct.toFixed(1)}%` : t('roi.notApplicable')
                }
              />
              <StatCard
                label={t('roi.costScalingFactor')}
                value={result.cost_scaling_factor != null ? result.cost_scaling_factor.toFixed(2) : t('roi.notApplicable')}
                hint={t('roi.costScalingHint')}
              />
            </div>
          </section>

          <section style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button type="button" onClick={() => handleExport('xlsx')} disabled={exportingXlsx} style={buttonStyle}>
              {exportingXlsx ? <IconSpinner size={15} /> : <IconDocument size={15} />} {t('roi.exportXlsx')}
            </button>
            <button type="button" onClick={() => handleExport('csv')} disabled={exportingCsv} style={buttonStyle}>
              {exportingCsv ? <IconSpinner size={15} /> : <IconDocument size={15} />} {t('roi.exportCsv')}
            </button>
          </section>
          {exportError && <p style={{ color: 'var(--danger-light)', fontSize: '0.85rem' }}>{exportError}</p>}
        </div>
      )}

      <section style={{ ...cardStyle, marginTop: '2rem', background: 'var(--bg-surface-alt)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconTarget size={16} /> {t('roi.integrationsTitle')}
        </h3>
        <p
          style={{
            color: 'var(--text-tertiary)',
            fontSize: '0.85rem',
            margin: 0,
            maxWidth: '640px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.4rem',
          }}
        >
          <IconAlertTriangle size={14} style={{ marginTop: '0.2rem', flexShrink: 0 }} />
          {t('roi.integrationsComingSoon')}
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem 1rem' }}>
      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.8rem' }}>{label}</p>
      <p style={{ fontWeight: 'bold', fontSize: '1.25rem', margin: '0.15rem 0 0', wordBreak: 'break-word' }}>{value}</p>
      {hint && <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: '0.7rem' }}>{hint}</p>}
    </div>
  );
}

function CostBar({
  label,
  value,
  max,
  color,
  display,
  last,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  display: string;
  last?: boolean;
}) {
  // Clamp to a visible sliver when the value is nonzero but tiny relative
  // to `max` (e.g. automated cost-per-transaction next to a manual one two
  // orders of magnitude larger) - otherwise the bar looks broken/empty.
  const rawPct = Math.max(0, Math.min(100, (value / max) * 100));
  const pct = value > 0 ? Math.max(rawPct, 1.5) : rawPct;
  return (
    <div style={{ marginBottom: last ? 0 : '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{display}</span>
      </div>
      <div style={{ height: '10px', borderRadius: '5px', background: 'var(--bg-surface)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}
