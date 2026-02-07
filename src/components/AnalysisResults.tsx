'use client';

import { AnalysisResult, ThesisPoint, RedFlag } from '@/types/analysis';
import ExpandableSection from './ExpandableSection';

interface AnalysisResultsProps {
  analysis: AnalysisResult;
}

function ThesisPointCard({ point, color }: { point: ThesisPoint; color: 'green' | 'red' }) {
  const borderColor = color === 'green' ? 'border-green-500' : 'border-red-500';
  const textColor = color === 'green' ? 'text-green-700' : 'text-red-700';
  const label = color === 'green' ? point.confidence : point.severity;

  return (
    <div className={`border-l-4 ${borderColor} pl-4 py-1`}>
      <h3 className="font-bold text-lg text-slate-900">
        {point.title}
        {label && (
          <span className="text-sm font-normal text-slate-500 ml-2">({label})</span>
        )}
      </h3>
      <div className="mt-2 space-y-1">
        {point.details.map((detail, i) => (
          <p key={i} className="text-slate-700 text-sm">&bull; {detail}</p>
        ))}
      </div>
      <p className={`mt-2 font-medium text-sm ${textColor}`}>
        &rarr; {point.implication}
      </p>
    </div>
  );
}

function RedFlagCard({ flag }: { flag: RedFlag }) {
  const severityConfig = {
    critical: { icon: '🔴', bg: 'bg-red-50', border: 'border-red-200', label: 'CRITICAL' },
    warning: { icon: '🟡', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'WARNING' },
    monitor: { icon: '🟢', bg: 'bg-green-50', border: 'border-green-200', label: 'MONITOR' },
  };
  const config = severityConfig[flag.severity];

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-slate-900">{flag.title}</h4>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              flag.severity === 'critical' ? 'bg-red-200 text-red-800' :
              flag.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
              'bg-green-200 text-green-800'
            }`}>
              {config.label}
            </span>
          </div>
          <p className="text-sm text-slate-700 mb-2">{flag.description}</p>
          <div className="space-y-1">
            {flag.details.map((d, i) => (
              <p key={i} className="text-xs text-slate-600">&bull; {d}</p>
            ))}
          </div>
          <p className="mt-2 text-sm font-medium text-slate-700">Impact: {flag.impact}</p>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const { quickStats, bullCase, bearCase, baseCase, keyQuestions, redFlags, cost, mode } = analysis;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          {analysis.companyName} - {analysis.filingType} {analysis.fiscalPeriod}
        </h1>
        <p className="text-slate-500 mt-1">
          Analyzed: {new Date(analysis.completedAt || analysis.createdAt).toLocaleDateString()} |
          Cost: ${cost?.total?.toFixed(2) || '0.00'} |
          Mode: {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </p>
      </div>

      {/* Quick Stats */}
      {quickStats && (
        <div className="bg-slate-50 rounded-xl p-6 mb-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-slate-500">Revenue</p>
              <p className="text-2xl font-bold text-slate-900">{quickStats.revenue}</p>
              <p className="text-sm text-green-600">{quickStats.revenueGrowthYoY} YoY, {quickStats.revenueGrowthQoQ} QoQ</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Operating Margin</p>
              <p className="text-2xl font-bold text-slate-900">{quickStats.operatingMargin}</p>
              <p className="text-sm text-green-600">{quickStats.operatingMarginChange}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Net Debt / EBITDA</p>
              <p className="text-2xl font-bold text-slate-900">{quickStats.netDebtToEbitda}</p>
              <p className="text-sm text-green-600">from {quickStats.netDebtToEbitdaPrior}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Red Flags</p>
              <div className="text-lg font-bold">
                {quickStats.redFlagsCritical > 0 && (
                  <span className="text-red-600">🔴 {quickStats.redFlagsCritical} critical </span>
                )}
                {quickStats.redFlagsWarning > 0 && (
                  <span className="text-yellow-600">🟡 {quickStats.redFlagsWarning} warnings </span>
                )}
                {quickStats.redFlagsMonitor > 0 && (
                  <span className="text-green-600">🟢 {quickStats.redFlagsMonitor} monitoring</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bull Case */}
      {bullCase && bullCase.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-green-700 mb-5">BULL CASE</h2>
          <div className="space-y-5">
            {bullCase.map((point, idx) => (
              <ThesisPointCard key={idx} point={point} color="green" />
            ))}
          </div>
        </div>
      )}

      {/* Bear Case */}
      {bearCase && bearCase.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-red-700 mb-5">BEAR CASE</h2>
          <div className="space-y-5">
            {bearCase.map((point, idx) => (
              <ThesisPointCard key={idx} point={point} color="red" />
            ))}
          </div>
        </div>
      )}

      {/* Base Case */}
      {baseCase && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">BASE CASE</h2>
          <div className="bg-blue-50 rounded-xl p-5">
            <p className="text-slate-800">{baseCase.scenario}</p>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-slate-600">
                <strong>Key dependency:</strong> {baseCase.dependency}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Main risk:</strong> {baseCase.mainRisk}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Questions */}
      {keyQuestions && keyQuestions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">KEY QUESTIONS FOR MANAGEMENT</h2>
          <ol className="list-decimal list-inside space-y-2">
            {keyQuestions.map((q, idx) => (
              <li key={idx} className="text-slate-700">{q}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Expandable Sections */}
      <div className="space-y-4 mt-10">
        {/* Red Flags - always shown */}
        {redFlags && redFlags.length > 0 && (
          <ExpandableSection
            title="Red Flag Report"
            badge={`${redFlags.length} items`}
            badgeColor={redFlags.some(f => f.severity === 'critical') ? 'red' : 'yellow'}
          >
            <div className="space-y-3">
              {redFlags.map((flag, idx) => (
                <RedFlagCard key={idx} flag={flag} />
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Financial Analysis - standard+ */}
        {analysis.financialAnalysis && (
          <ExpandableSection title="Detailed Financial Analysis" badge="6 sections">
            <div className="space-y-6">
              {Object.entries(analysis.financialAnalysis).map(([key, value]) => (
                <div key={key}>
                  <h4 className="font-semibold text-slate-900 mb-2 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{value}</p>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Peer Comparison - standard+ */}
        {analysis.peerComparison && analysis.peerComparison.length > 0 && (
          <ExpandableSection
            title="Peer Comparison"
            badge={`vs ${analysis.peerComparison.length} companies`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Company</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">Rev Growth</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">Gross Margin</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">Op Margin</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">ND/EBITDA</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">EV/Rev</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Target company row */}
                  {quickStats && (
                    <tr className="border-b border-slate-100 bg-blue-50 font-medium">
                      <td className="py-2 px-3 text-blue-700">{analysis.companyName} (Target)</td>
                      <td className="text-right py-2 px-3">{quickStats.revenueGrowthYoY}</td>
                      <td className="text-right py-2 px-3">65.2%</td>
                      <td className="text-right py-2 px-3">{quickStats.operatingMargin}</td>
                      <td className="text-right py-2 px-3">{quickStats.netDebtToEbitda}</td>
                      <td className="text-right py-2 px-3">-</td>
                    </tr>
                  )}
                  {analysis.peerComparison.map((peer, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-2 px-3 text-slate-900">{peer.ticker} - {peer.name}</td>
                      <td className="text-right py-2 px-3 text-slate-700">{peer.revenueGrowth}</td>
                      <td className="text-right py-2 px-3 text-slate-700">{peer.grossMargin}</td>
                      <td className="text-right py-2 px-3 text-slate-700">{peer.operatingMargin}</td>
                      <td className="text-right py-2 px-3 text-slate-700">{peer.netDebtToEbitda}</td>
                      <td className="text-right py-2 px-3 text-slate-700">{peer.evToRevenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ExpandableSection>
        )}

        {/* Tone Analysis - standard+ */}
        {analysis.toneAnalysis && (
          <ExpandableSection title="Management Tone Analysis">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-lg font-semibold ${
                  analysis.toneAnalysis.overallSentiment === 'bullish' ? 'bg-green-100 text-green-700' :
                  analysis.toneAnalysis.overallSentiment === 'bearish' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {analysis.toneAnalysis.overallSentiment.toUpperCase()}
                </div>
                <span className="text-sm text-slate-600">
                  Sentiment Score: {analysis.toneAnalysis.sentimentScore.toFixed(2)} (-1 to +1)
                </span>
                <span className="text-sm text-slate-600">
                  Readability: {analysis.toneAnalysis.readabilityScore} (Fog Index)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">Bullish Words</h4>
                  {analysis.toneAnalysis.bullishWords.map((w, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-slate-700">{w.word}</span>
                      <span className="text-slate-500">{w.count}x</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 mb-2">Bearish Words</h4>
                  {analysis.toneAnalysis.bearishWords.map((w, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-slate-700">{w.word}</span>
                      <span className="text-slate-500">{w.count}x</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-700 mb-2">Hedge Words</h4>
                  {analysis.toneAnalysis.hedgeWords.map((w, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-slate-700">{w.word}</span>
                      <span className="text-slate-500">{w.count}x</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Key Phrases</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.toneAnalysis.keyPhrases.map((phrase, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700">
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Tone Shift Assessment</h4>
                <p className="text-sm text-slate-700">{analysis.toneAnalysis.toneShift}</p>
              </div>
            </div>
          </ExpandableSection>
        )}

        {/* Segment Analysis - deep only */}
        {analysis.segmentAnalysis && (
          <ExpandableSection
            title="Segment Analysis"
            badge={`${analysis.segmentAnalysis.segments.length} segments`}
          >
            <div className="space-y-4">
              {analysis.segmentAnalysis.segments.map((seg, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-slate-900 text-lg">{seg.name}</h4>
                    <span className={`text-sm font-medium ${
                      seg.growth.includes('+') && parseFloat(seg.growth) > 15 ? 'text-green-600' : 'text-slate-600'
                    }`}>
                      {seg.growth}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-slate-500">Revenue</p>
                      <p className="font-medium text-slate-900">{seg.revenue}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Operating Income</p>
                      <p className="font-medium text-slate-900">{seg.operatingIncome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Margin</p>
                      <p className="font-medium text-slate-900">{seg.margin}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700">{seg.commentary}</p>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Competitor Intel - deep only */}
        {analysis.competitorIntel && (
          <ExpandableSection
            title="Private Competitor Intelligence"
            badge={`${analysis.competitorIntel.competitors.length} threats`}
            badgeColor="red"
          >
            <div className="space-y-4">
              {analysis.competitorIntel.competitors.map((comp, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 text-lg mb-1">{comp.name}</h4>
                  <p className="text-sm text-slate-600 mb-3">{comp.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-slate-700">Funding: </span>
                      <span className="text-slate-600">{comp.fundingRaised}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Business Model: </span>
                      <span className="text-slate-600">{comp.businessModel}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Recent News: </span>
                      <span className="text-slate-600">{comp.recentNews}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Potential Impact: </span>
                      <span className={`font-semibold ${
                        comp.potentialImpact.startsWith('HIGH') ? 'text-red-600' :
                        comp.potentialImpact.startsWith('MEDIUM') ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {comp.potentialImpact}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Footnote Analysis - deep only */}
        {analysis.footnoteAnalysis && (
          <ExpandableSection title="Footnote Deep Dive">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
              {analysis.footnoteAnalysis}
            </pre>
          </ExpandableSection>
        )}

        {/* Smart Highlights - deep only */}
        {analysis.smartHighlights && analysis.smartHighlights.length > 0 && (
          <ExpandableSection
            title="Smart Highlights"
            badge={`${analysis.smartHighlights.length} changes`}
            badgeColor="yellow"
          >
            <div className="space-y-2">
              {analysis.smartHighlights.map((highlight, idx) => (
                <div key={idx} className="py-2 border-b border-slate-100 last:border-0">
                  <p className="text-sm text-slate-700">{highlight}</p>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}
      </div>

      {/* Cost Breakdown */}
      {cost && (
        <div className="mt-10 bg-slate-50 rounded-xl p-6">
          <h3 className="font-semibold text-slate-700 mb-3">Analysis Cost Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {cost.breakdown.financial > 0 && (
              <div>
                <p className="text-slate-500">Financial Analysis</p>
                <p className="font-medium text-slate-900">${cost.breakdown.financial.toFixed(4)}</p>
              </div>
            )}
            {cost.breakdown.redFlags > 0 && (
              <div>
                <p className="text-slate-500">Red Flags</p>
                <p className="font-medium text-slate-900">${cost.breakdown.redFlags.toFixed(4)}</p>
              </div>
            )}
            {cost.breakdown.synthesis > 0 && (
              <div>
                <p className="text-slate-500">Synthesis</p>
                <p className="font-medium text-slate-900">${cost.breakdown.synthesis.toFixed(4)}</p>
              </div>
            )}
            {cost.breakdown.tone > 0 && (
              <div>
                <p className="text-slate-500">Tone Analysis</p>
                <p className="font-medium text-slate-900">${cost.breakdown.tone.toFixed(4)}</p>
              </div>
            )}
            {cost.breakdown.peers > 0 && (
              <div>
                <p className="text-slate-500">Peer Comparison</p>
                <p className="font-medium text-slate-900">${cost.breakdown.peers.toFixed(4)}</p>
              </div>
            )}
            {cost.breakdown.segments && cost.breakdown.segments > 0 && (
              <div>
                <p className="text-slate-500">Segments</p>
                <p className="font-medium text-slate-900">${cost.breakdown.segments.toFixed(4)}</p>
              </div>
            )}
            {cost.breakdown.competitors && cost.breakdown.competitors > 0 && (
              <div>
                <p className="text-slate-500">Competitors</p>
                <p className="font-medium text-slate-900">${cost.breakdown.competitors.toFixed(4)}</p>
              </div>
            )}
            {cost.breakdown.footnotes && cost.breakdown.footnotes > 0 && (
              <div>
                <p className="text-slate-500">Footnotes</p>
                <p className="font-medium text-slate-900">${cost.breakdown.footnotes.toFixed(4)}</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
            <span className="font-semibold text-slate-900">Total Cost</span>
            <span className="text-lg font-bold text-slate-900">${cost.total.toFixed(2)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Total tokens: {cost.calls.reduce((sum, c) => sum + c.inputTokens + c.outputTokens, 0).toLocaleString()} |
            API calls: {cost.calls.length}
          </p>
        </div>
      )}
    </div>
  );
}
