"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../component/Navbar";
import Footer from "../component/Footer";
import { Lock, CreditCard, CheckCircle, XCircle, Edit2, Save, Wallet, Shield } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export default function FlagsFeaturePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  type DepositMethod = {
    id: number;
    name: string;
    accountInfo: string;
    accountOwner: string;
    isActive: boolean;
  };

  type FlagsApiResponse = {
    success: boolean;
    withdrawActive: boolean;
    depositMethods: DepositMethod[];
  };

  const [withdrawActive, setWithdrawActive] = useState<boolean>(true);
  const [depositMethods, setDepositMethods] = useState<DepositMethod[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    accountInfo: "",
    accountOwner: ""
  });

  const fetchFlags = async () => {
    setLoading(true);
    setError("");
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("admin_token") : null;
      const res = await axios.get<FlagsApiResponse>(`${BACKEND_URL}/flags`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true,
      });
      if (res.data.success) {
        setWithdrawActive(res.data.withdrawActive);
        setDepositMethods(res.data.depositMethods);
      } else {
        setError("Failed to load flags");
      }
    } catch (e) {
      setError("Failed to load flags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleWithdrawLock = async (active: boolean) => {
    setSaving(true);
    setError("");
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("admin_token") : null;
      await axios.post(`${BACKEND_URL}/flags/withdraw`, { isActive: active }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true,
      });
      setWithdrawActive(active);
    } catch (e) {
      setError("Failed to update withdraw lock");
    } finally {
      setSaving(false);
    }
  };

  const handleDepositMethodActive = async (id: number, isActive: boolean) => {
    setSaving(true);
    setError("");
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("admin_token") : null;
      await axios.post(`${BACKEND_URL}/flags/deposit-method/${id}/active`, { isActive }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true,
      });
      setDepositMethods((prev) => prev.map((m) => m.id === id ? { ...m, isActive } : m));
    } catch (e) {
      setError("Failed to update deposit method");
    } finally {
      setSaving(false);
    }
  };

  const handleDepositMethodUpdate = async (id: number, data: Partial<Omit<DepositMethod, "id" | "isActive">>) => {
    setSaving(true);
    setError("");
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("admin_token") : null;
      await axios.post(`${BACKEND_URL}/flags/deposit-method/${id}`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true,
      });
      setDepositMethods((prev) => prev.map((m) => m.id === id ? { ...m, ...data } : m));
      setEditingId(null);
    } catch (e) {
      setError("Failed to update deposit method");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (method: DepositMethod) => {
    setEditingId(method.id);
    setEditForm({
      name: method.name,
      accountInfo: method.accountInfo,
      accountOwner: method.accountOwner
    });
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-16 px-4 bg-linear-to-br from-gray-50 to-gray-100/30">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-linear-to-br from-gray-100 to-gray-200/50">
                <Shield className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">System Flags & Payment Methods</h1>
                <p className="text-sm text-gray-600 mt-1">Manage withdrawal settings and deposit methods</p>
              </div>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-500 font-medium">Loading system settings...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Withdrawal Lock Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-linear-to-br from-blue-50 to-blue-100/50">
                    <Lock className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Withdrawal Control</h2>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${withdrawActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {withdrawActive ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 font-medium">
                        Withdrawals are {withdrawActive ? 'Active' : 'Paused'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {withdrawActive ? 'Users can withdraw funds' : 'Withdrawals are temporarily disabled'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      withdrawActive
                        ? 'bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                        : 'bg-linear-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                    } shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed`}
                    disabled={saving}
                    onClick={() => handleWithdrawLock(!withdrawActive)}
                  >
                    <Lock className="w-4 h-4" />
                    {withdrawActive ? 'Disable Withdrawals' : 'Enable Withdrawals'}
                  </button>
                </div>
              </div>

              {/* Deposit Methods Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-linear-to-br from-green-50 to-green-100/50">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Deposit Methods</h2>
                    <p className="text-sm text-gray-600 mt-0.5">Manage available payment methods</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {depositMethods.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-12 h-12 bg-linear-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                        <Wallet className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 font-medium">No deposit methods</p>
                      <p className="text-xs text-gray-500 mt-1">Add deposit methods to get started</p>
                    </div>
                  ) : (
                    depositMethods.map((method) => (
                      <div key={method.id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-gray-900">{method.name}</span>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                method.isActive 
                                  ? 'bg-green-50 text-green-700 border border-green-200' 
                                  : 'bg-gray-50 text-gray-700 border border-gray-200'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${method.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                {method.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            
                            {editingId === method.id ? (
                              <div className="space-y-3 mt-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Name</label>
                                    <input
                                      value={editForm.name}
                                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Account Info</label>
                                    <input
                                      value={editForm.accountInfo}
                                      onChange={(e) => setEditForm({...editForm, accountInfo: e.target.value})}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Account Owner</label>
                                    <input
                                      value={editForm.accountOwner}
                                      onChange={(e) => setEditForm({...editForm, accountOwner: e.target.value})}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDepositMethodUpdate(method.id, editForm)}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-sm text-gray-600 mb-1">Account: {method.accountInfo}</div>
                                <div className="text-sm text-gray-600">Owner: {method.accountOwner}</div>
                              </>
                            )}
                          </div>
                          
                          {editingId !== method.id && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDepositMethodActive(method.id, !method.isActive)}
                                disabled={saving}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                  method.isActive
                                    ? 'bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                                    : 'bg-linear-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                                } shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed`}
                              >
                                {method.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => startEditing(method)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}