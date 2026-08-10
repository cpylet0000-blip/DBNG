'use client';
import React, { useState, useEffect } from 'react';
import { Gift, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

interface StakeBonus {
  id: number;
  stake: number;
  bonusAmount: number;
  enabled: boolean;
}

const StakeBonusesManager: React.FC = () => {
  const [bonuses, setBonuses] = useState<StakeBonus[]>([
    { id: 0, stake: 10, bonusAmount: 0, enabled: false },
    { id: 0, stake: 20, bonusAmount: 0, enabled: false },
    { id: 0, stake: 50, bonusAmount: 0, enabled: false },
    { id: 0, stake: 100, bonusAmount: 0, enabled: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStakeBonuses = async () => {
    try {
      setLoading(true);
      const res = await axios.get(process.env.NEXT_PUBLIC_BACKEND_URL + '/admin/stake-bonuses', { withCredentials: true });
      
      if (res.data?.success && res.data?.bonuses) {
        // Ensure bonusAmount is always a number
        setBonuses(res.data.bonuses.map((b: StakeBonus) => ({ ...b, bonusAmount: Number(b.bonusAmount) })));
      } else {
        setMessage({ type: 'error', text: res.data?.error || 'Failed to fetch stake bonuses' });
      }
    } catch (error) {
      console.error('Error fetching stake bonuses:', error);
      setMessage({ type: 'error', text: 'Network error while fetching bonuses' });
    } finally {
      setLoading(false);
    }
  };

  const saveStakeBonuses = async () => {
    try {
      setSaving(true);
      const res = await axios.put(
        process.env.NEXT_PUBLIC_BACKEND_URL + '/admin/stake-bonuses', 
        { bonuses }, 
        { withCredentials: true }
      );
      
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Stake bonuses updated successfully!' });
        if (res.data?.bonuses) {
          setBonuses(res.data.bonuses.map((b: StakeBonus) => ({ ...b, bonusAmount: Number(b.bonusAmount) })));
        }
      } else {
        setMessage({ type: 'error', text: res.data?.error || 'Failed to update stake bonuses' });
      }
    } catch (error) {
      console.error('Error saving stake bonuses:', error);
      setMessage({ type: 'error', text: 'Network error while saving bonuses' });
    } finally {
      setSaving(false);
    }
  };

  const updateBonus = (stake: number, field: 'bonusAmount' | 'enabled', value: number | boolean) => {
    setBonuses(prev => prev.map(bonus => 
      bonus.stake === stake ? { ...bonus, [field]: value } : bonus
    ));
  };

  const clearMessage = () => {
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    fetchStakeBonuses();
  }, []);

  useEffect(() => {
    if (message) {
      clearMessage();
    }
  }, [message]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-3" />
          <span>Loading stake bonuses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <Gift className="w-6 h-6 text-yellow-500" />
          bonus Management
        </h2>
        <p className="text-gray-600">
          Configure bonus amounts for different stake levels in bingo games.
        </p>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}c
        </div>
      )}

      {/* Bonus Configuration Table - Refactored to Table Layout */}
      <div className="bg-gray-50 rounded-lg overflow-x-auto">
        <div className="bg-gray-100 px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-700">Current Bonus Configuration</h3>
        </div>
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-4 font-medium text-gray-600">Stake Amount</th>
              <th className="py-3 px-4 font-medium text-gray-600">Bonus Amount</th>
              <th className="py-3 px-4 font-medium text-gray-600">Status</th>
              <th className="py-3 px-4 font-medium text-gray-600">Preview</th>
            </tr>
          </thead>
          <tbody>
            {bonuses.map((bonus) => (
              <tr key={bonus.stake} className="bg-white border-b last:border-b-0">
                <td className="py-3 px-4 font-bold text-gray-900">
                  {bonus.stake} <span className="text-sm text-gray-500">ETB</span>
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    min="0"
                    value={bonus.bonusAmount}
                    onChange={(e) => updateBonus(bonus.stake, 'bonusAmount', parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => updateBonus(bonus.stake, 'enabled', !bonus.enabled)}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      bonus.enabled
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-500 hover:bg-gray-400 text-white'
                    }`}
                  >
                    {bonus.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="py-3 px-4">
                  {bonus.enabled && bonus.bonusAmount > 0 ? (
                    <span className="flex items-center gap-1 text-yellow-600 font-bold">
                      <Gift className="w-4 h-4" />
                      +{bonus.bonusAmount}
                    </span>
                  ) : (
                    <span className="text-gray-400">No bonus</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-4 justify-end">
        <button
          onClick={fetchStakeBonuses}
          disabled={saving}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        
        <button
          onClick={saveStakeBonuses}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
        >
          <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default StakeBonusesManager;
