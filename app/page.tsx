'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Dashboard() {
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState('Jun-26')

  useEffect(() => {
    fetchData()
  }, [month])

  async function fetchData() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('v_store_performance')
        .select('*')
        .eq('month_year', month)
        .order('region')
        .order('city')

      if (error) throw error
      setStores(data || [])
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  function formatCurrency(num: number): string {
    if (!num) return '₹0'
    const abs = Math.abs(num)
    if (abs >= 10000000) return '₹' + (num / 10000000).toFixed(2) + 'Cr'
    if (abs >= 100000) return '₹' + (num / 100000).toFixed(2) + 'L'
    return '₹' + num.toLocaleString('en-IN')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8 rounded-lg mb-8">
        <h1 className="text-4xl font-bold">🏪 Seiko Sales Dashboard</h1>
        <p className="text-lg mt-2">Real-Time Store Performance & Analytics</p>
      </header>

      <nav className="flex gap-4 mb-8 border-b">
        <Link href="/" className="px-4 py-2 border-b-2 border-purple-600 text-purple-600 font-bold">
          📊 Live Sales
        </Link>
        <Link href="/validation-logs" className="px-4 py-2 text-gray-600 hover:text-purple-600">
          📋 Validation Logs
        </Link>
        <Link href="/change-approvals" className="px-4 py-2 text-gray-600 hover:text-purple-600">
          ✅ Change Approvals
        </Link>
      </nav>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex gap-4 mb-6">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-4 py-2 border rounded"
          >
            <option>Apr-26</option>
            <option>May-26</option>
            <option>Jun-26</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center py-8">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Store Name</th>
                  <th className="px-4 py-2 text-left">Region/City</th>
                  <th className="px-4 py-2 text-right">Target</th>
                  <th className="px-4 py-2 text-right">Actual Sales</th>
                  <th className="px-4 py-2 text-right">Achievement %</th>
                  <th className="px-4 py-2 text-right">Units</th>
                  <th className="px-4 py-2 text-right">ASP</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr
                    key={store.store_id}
                    className={`border-t ${
                      store.achievement_percent >= 80 ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <td className="px-4 py-2 font-semibold">{store.store_name}</td>
                    <td className="px-4 py-2">{store.region}/{store.city}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(store.target_value)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(store.actual_sales)}</td>
                    <td className="px-4 py-2 text-right font-bold">{store.achievement_percent?.toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right">{store.units_sold}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(store.asp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}