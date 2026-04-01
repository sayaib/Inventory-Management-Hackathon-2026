import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  QrCode, 
  Search, 
  Package, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCcw, 
  AlertCircle,
  X,
  Plus,
  Edit3,
  Layers,
  MapPin,
  Briefcase,
  ShieldAlert,
  Activity,
  History,
  ChevronDown
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api/axios';
import { ROLES } from '../constants/roles';
import { ASSET_CATEGORIES, ASSET_LOCATIONS, DEPARTMENTS } from '../constants/assets';

const WarehousePanel = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('movement'); // 'movement', 'add', or 'history'
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['movement', 'add', 'history'].includes(tab)) {
      if (tab === 'add' && user?.role === ROLES.INVENTORY_MANAGER) {
        setActiveTab('movement');
      } else {
        setActiveTab(tab);
      }
    }
  }, [location.search, user?.role]);

  const [, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualSku, setManualSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [movementType, setMovementType] = useState('IN'); // 'IN' or 'OUT'
  const [movementReason, setMovementReason] = useState('PURCHASE');
  const [movementUnitCost, setMovementUnitCost] = useState('');
  const [movementReference, setMovementReference] = useState('');
  const [movementNotes, setMovementNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [confirmUpdate, setConfirmUpdate] = useState(null); // { asset, type, quantity, projectId, reason, unitCost, reference, notes }
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [movementProjectId, setMovementProjectId] = useState('');
  
  // History State
  const [logs, setLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logLoading, setLogLoading] = useState(false);
  const [logType, setLogType] = useState('OUT'); // Default to consumption
  const [logSearch, setLogSearch] = useState('');

  useEffect(() => {
    if (activeTab === 'history' && logType !== 'OUT') {
      setLogType('OUT');
      setLogPage(1);
    }
  }, [activeTab, logType]);

  // Form state for adding new asset
  const [newAsset, setNewAsset] = useState({
    itemName: '',
    category: ASSET_CATEGORIES[0],
    department: DEPARTMENTS[0],
    subDepartment: '',
    totalQuantity: 1,
    unit: 'pcs',
    location: ASSET_LOCATIONS[0],
    purchaseCost: 0,
    lowStockThreshold: 5,
    vendorName: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    metadata: {}
  });

  const [, setLastAction] = useState(null); // { message, type }

  const fetchInventory = useCallback(async () => {
    try {
      const res = await api.get('/inventory');
      setInventory(res.data.assets || []);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogLoading(true);
    try {
      const params = {
        page: logPage,
        limit: 10,
        type: logType !== 'ALL' ? logType : undefined,
        search: logSearch || undefined
      };
      const res = await api.get('/inventory/logs', { params });
      setLogs(res.data.logs || []);
      setLogTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLogLoading(false);
    }
  }, [logPage, logSearch, logType]);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchLogs();
  }, [fetchInventory, fetchLogs]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const onScanSuccess = useCallback(async (decodedText) => {
    setIsScanning(false);
    setManualSku(decodedText);
    setScanResult(decodedText);

    setError('');
    setLoading(true);
    try {
      const res = await api.get(`/inventory/id/${decodedText}`);
      if (res.data) {
        if (movementType === 'OUT' && movementReason === 'CONSUMPTION' && !movementProjectId) {
          setError('Select a project before processing Stock Out.');
          return;
        }
        setConfirmUpdate({
          asset: res.data,
          type: movementType,
          quantity: Number(quantity),
          projectId: movementType === 'OUT' ? movementProjectId : '',
          reason: movementReason,
          unitCost: movementUnitCost,
          reference: movementReference,
          notes: movementNotes
        });
      }
    } catch {
      setError('Scanned item not found in inventory.');
    } finally {
      setLoading(false);
    }
  }, [movementNotes, movementProjectId, movementReason, movementReference, movementType, movementUnitCost, quantity]);

  const onScanError = useCallback(() => {}, []);

  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      });

      scanner.render(onScanSuccess, onScanError);

      return () => {
        scanner.clear().catch(err => console.error("Failed to clear scanner", err));
      };
    }
  }, [isScanning, onScanError, onScanSuccess]);

  const handleStockUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (movementType === 'OUT' && movementReason === 'CONSUMPTION' && !movementProjectId) {
        setError('Select a project before processing Stock Out.');
        setLoading(false);
        return;
      }
      // Fetch asset details from server by assetId/SKU
      const res = await api.get(`/inventory/id/${manualSku}`);
      const asset = res.data;
      
      if (!asset) {
        setError('Asset not found in inventory. Please check the SKU/ID.');
        setLoading(false);
        return;
      }

      setConfirmUpdate({
        asset,
        type: movementType,
        quantity: Number(quantity),
        projectId: movementType === 'OUT' ? movementProjectId : '',
        reason: movementReason,
        unitCost: movementUnitCost,
        reference: movementReference,
        notes: movementNotes
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Asset not found or server error');
    } finally {
      setLoading(false);
    }
  };

  const performStockUpdate = async () => {
    if (!confirmUpdate) return;
    const { asset, type, quantity, projectId, reason, unitCost, reference, notes } = confirmUpdate;
    setLoading(true);
    setError('');

    try {
      await api.post('/inventory/update-stock', {
        sku: asset.assetId, // Using assetId as the primary identifier
        quantityChange: quantity,
        type: type,
        projectId: projectId || undefined,
        reason: reason || undefined,
        unitCost: type === 'IN' ? (unitCost || undefined) : undefined,
        reference: type === 'IN' ? (reference || undefined) : undefined,
        notes: notes || undefined
      });
      const message = `Successfully ${type === 'IN' ? 'added' : 'removed'} ${quantity} ${asset.unit || 'pcs'} of ${asset.itemName}.`;
      setSuccess(message);
      setLastAction({ message, type });
      setManualSku('');
      setQuantity(1);
      setMovementUnitCost('');
      setMovementReference('');
      setMovementNotes('');
      setScanResult(null);
      setConfirmUpdate(null);
      fetchInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
      setConfirmUpdate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.post('/inventory/add', newAsset);
      setSuccess('Asset added successfully!');
      setNewAsset({
        itemName: '',
        category: ASSET_CATEGORIES[0],
        department: DEPARTMENTS[0],
        subDepartment: '',
        totalQuantity: 1,
        unit: 'pcs',
        location: ASSET_LOCATIONS[0],
        purchaseCost: 0,
        vendorName: '',
        invoiceNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        metadata: {}
      });
      fetchInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Inventory Operations</h1>
            <p className="text-sm text-gray-600 mt-0.5">Manage stock movements or add new items.</p>
          </div>
          <div className="bg-primary-100 px-3 py-1.5 rounded-full text-primary-700 font-medium text-xs flex items-center">
            <RefreshCcw className="h-3 w-3 mr-1.5" />
            Real-time Sync Active
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="flex space-x-2 p-1 bg-gray-200/50 w-fit rounded-xl mx-auto">
          <button 
            onClick={() => setActiveTab('movement')}
            className={`px-5 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'movement' ? 'bg-white text-primary shadow-sm font-bold' : 'text-gray-500 font-medium hover:bg-gray-200'
            }`}
          >
            <RefreshCcw className="h-4 w-4" />
            <span className="text-sm">Stock Movement</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'history' ? 'bg-white text-primary shadow-sm font-bold' : 'text-gray-500 font-medium hover:bg-gray-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span className="text-sm">Consumption History</span>
          </button>
          {user?.role !== ROLES.INVENTORY_MANAGER && (
            <button 
              onClick={() => setActiveTab('add')}
              className={`px-5 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'add' ? 'bg-white text-primary shadow-sm font-bold' : 'text-gray-500 font-medium hover:bg-gray-200'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Add New Asset</span>
            </button>
          )}
        </div>

        {/* Status Messages */}
        <div className="space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center text-sm font-bold animate-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-primary-50 border border-primary-100 text-primary-700 px-4 py-3 rounded-xl flex items-center text-sm font-bold animate-in slide-in-from-top-2">
              <RefreshCcw className="h-4 w-4 mr-2 flex-shrink-0 animate-spin-slow" />
              {success}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Action Card */}
          <div className="lg:col-span-2 space-y-4">
            {activeTab === 'history' ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[500px]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Consumption History</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-black px-3 py-1.5 rounded-lg bg-red-50 text-red-600 uppercase tracking-wider">
                      OUT
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Search item..."
                        className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                        value={logSearch}
                        onChange={(e) => { setLogSearch(e.target.value); setLogPage(1); }}
                      />
                    </div>
                  </div>
                </div>

                {logLoading ? (
                  <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 italic">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No movement logs found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                          <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
                          <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qty</th>
                          <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">By</th>
                          <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {logs.map((log) => (
                          <tr key={log._id} className="group hover:bg-gray-50 transition-colors">
                            <td className="py-3">
                              <div className="font-bold text-sm text-gray-900">{log.itemName}</div>
                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{log.sku}</div>
                              {log.projectName && (
                                <div className="text-[10px] text-primary font-bold uppercase tracking-tighter">
                                  {log.projectName}
                                </div>
                              )}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                log.type === 'IN' ? 'bg-primary-50 text-primary' : 'bg-accent-50 text-accent'
                              }`}>
                                {log.type}
                              </span>
                            </td>
                            <td className="py-3 font-bold text-sm text-gray-700">{log.quantity}</td>
                            <td className="py-3 text-xs text-gray-500">{log.performedBy}</td>
                            <td className="py-3 text-xs text-gray-400 text-right font-medium">
                              {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              <div className="text-[9px] opacity-60">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {logTotalPages > 1 && (
                      <div className="flex justify-center items-center mt-6 space-x-2">
                        <button 
                          disabled={logPage === 1}
                          onClick={() => setLogPage(prev => Math.max(1, prev - 1))}
                          className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-primary disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4 rotate-90" />
                        </button>
                        <span className="text-xs font-bold text-gray-500">Page {logPage} of {logTotalPages}</span>
                        <button 
                          disabled={logPage === logTotalPages}
                          onClick={() => setLogPage(prev => Math.min(logTotalPages, prev + 1))}
                          className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-primary disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4 -rotate-90" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                {activeTab === 'movement' ? (
                <div className="space-y-4">
                  <div className="flex space-x-2 p-1 bg-gray-100 rounded-xl">
                    <button 
                      onClick={() => { setMovementType('IN'); setMovementReason('PURCHASE'); setMovementProjectId(''); }}
                      className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${
                        movementType === 'IN' ? 'bg-white text-primary shadow-sm font-bold' : 'text-gray-500 font-medium'
                      }`}
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-1.5" />
                      <span className="text-sm">Stock In</span>
                    </button>
                    <button 
                      onClick={() => { setMovementType('OUT'); setMovementReason('CONSUMPTION'); }}
                      className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${
                        movementType === 'OUT' ? 'bg-white text-accent shadow-sm font-bold' : 'text-gray-500 font-medium'
                      }`}
                    >
                      <ArrowDownCircle className="h-4 w-4 mr-1.5" />
                      <span className="text-sm">Stock Out</span>
                    </button>
                  </div>

                  {!isScanning ? (
                    <div className="space-y-4">
                      <button 
                        onClick={() => setIsScanning(true)}
                        className="w-full py-8 border-2 border-dashed border-primary-100 rounded-xl flex flex-col items-center justify-center text-primary hover:bg-primary-50 transition-all group"
                      >
                        <QrCode className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-sm">Scan QR / Barcode</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">Use your device's camera</span>
                      </button>

                      <div className="relative flex items-center">
                        <div className="flex-grow border-t border-gray-100"></div>
                        <span className="flex-shrink mx-3 text-gray-400 text-[10px] font-bold uppercase tracking-wider">OR MANUAL ENTRY</span>
                        <div className="flex-grow border-t border-gray-100"></div>
                      </div>

                      <form onSubmit={handleStockUpdate} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Item SKU or Asset ID</label>
                          <div className="relative group">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                            <input 
                              type="text"
                              required
                              placeholder="Type or Scan ID..."
                              className="w-full pl-10 pr-12 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-medium"
                              value={manualSku}
                              onChange={(e) => setManualSku(e.target.value)}
                            />
                            {manualSku && (
                              <button 
                                type="button"
                                onClick={() => setManualSku('')}
                                className="absolute right-3 top-3 p-0.5 hover:bg-gray-200 rounded-md transition-colors"
                              >
                                <X className="h-4 w-4 text-gray-400" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Transaction Quantity</label>
                          <div className="flex items-center space-x-3">
                            <button 
                              type="button"
                              onClick={() => setQuantity(Math.max(1, quantity - 1))}
                              className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors active:scale-90"
                            >
                              <X className="h-4 w-4 text-gray-600" />
                            </button>
                            <input 
                              type="number"
                              required
                              min="1"
                              className="flex-1 py-3 text-base bg-gray-50 border border-gray-200 rounded-xl text-center font-extrabold focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                              value={quantity}
                              onChange={(e) => setQuantity(Number(e.target.value))}
                            />
                            <button 
                              type="button"
                              onClick={() => setQuantity(quantity + 1)}
                              className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors active:scale-90"
                            >
                              <Plus className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Reason</label>
                          <select
                            value={movementReason}
                            onChange={(e) => { setMovementReason(e.target.value); if (e.target.value !== 'CONSUMPTION') setMovementProjectId(''); }}
                            className="w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold"
                          >
                            {movementType === 'IN' ? (
                              <>
                                <option value="PURCHASE">PURCHASE</option>
                                <option value="RETURN">RETURN</option>
                                <option value="ADJUSTMENT">ADJUSTMENT</option>
                              </>
                            ) : (
                              <>
                                <option value="CONSUMPTION">CONSUMPTION</option>
                                <option value="WASTAGE">WASTAGE</option>
                                <option value="EXPIRED">EXPIRED</option>
                                <option value="DAMAGED">DAMAGED</option>
                                <option value="SHRINKAGE">SHRINKAGE</option>
                                <option value="ADJUSTMENT">ADJUSTMENT</option>
                              </>
                            )}
                          </select>
                        </div>

                        {movementType === 'IN' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Unit Cost</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Optional"
                                value={movementUnitCost}
                                onChange={(e) => setMovementUnitCost(e.target.value)}
                                className="w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Reference</label>
                              <input
                                type="text"
                                placeholder="Invoice / GRN (Optional)"
                                value={movementReference}
                                onChange={(e) => setMovementReference(e.target.value)}
                                className="w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold"
                              />
                            </div>
                          </div>
                        )}

                        {movementType === 'OUT' && (
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Project</label>
                            <select
                              required={movementReason === 'CONSUMPTION'}
                              value={movementProjectId}
                              onChange={(e) => setMovementProjectId(e.target.value)}
                              className="w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold"
                            >
                              <option value="">{projectsLoading ? 'Loading projects…' : 'Select project (required for consumption)'}</option>
                              {projects.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.code} — {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Notes</label>
                          <input
                            type="text"
                            placeholder="Optional"
                            value={movementNotes}
                            onChange={(e) => setMovementNotes(e.target.value)}
                            className="w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold"
                          />
                        </div>

                        <button 
                          type="submit"
                          disabled={loading || !manualSku || (movementType === 'OUT' && movementReason === 'CONSUMPTION' && !movementProjectId)}
                          className={`w-full py-4 rounded-2xl text-white font-black text-lg shadow-lg transform transition-all active:scale-95 flex items-center justify-center space-x-2 ${
                            movementType === 'IN' 
                              ? 'bg-primary hover:bg-primary-700 shadow-primary/10' 
                              : 'bg-accent hover:bg-accent-700 shadow-accent/10'
                          } disabled:opacity-50 disabled:scale-100`}
                        >
                          {loading ? (
                            <RefreshCcw className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              {movementType === 'IN' ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                              <span>Process {movementType === 'IN' ? 'Stock In' : 'Stock Out'}</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div id="reader" className="overflow-hidden rounded-xl border-2 border-primary-50"></div>
                      <button 
                        onClick={() => setIsScanning(false)}
                        className="w-full py-2 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        Cancel Scanning
                      </button>
                    </div>
                  )}
                </div>
              ) : activeTab === 'add' && user?.role !== ROLES.INVENTORY_MANAGER ? (
                <form onSubmit={handleAddAsset} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Item Name</label>
                      <div className="relative">
                        <Edit3 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                          type="text"
                          required
                          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                          value={newAsset.itemName}
                          onChange={(e) => setNewAsset({...newAsset, itemName: e.target.value})}
                          placeholder="e.g. Cisco Router A100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Category</label>
                      <div className="relative">
                        <Layers className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <select 
                          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none appearance-none"
                          value={newAsset.category}
                          onChange={(e) => setNewAsset({...newAsset, category: e.target.value})}
                        >
                          {ASSET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <select 
                          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none appearance-none"
                          value={newAsset.location}
                          onChange={(e) => setNewAsset({...newAsset, location: e.target.value})}
                        >
                          {ASSET_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Department</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <select 
                          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none appearance-none"
                          value={newAsset.department}
                          onChange={(e) => setNewAsset({...newAsset, department: e.target.value})}
                        >
                          {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Quantity</label>
                      <input 
                        type="number"
                        required
                        className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                        value={newAsset.totalQuantity}
                        onChange={(e) => setNewAsset({...newAsset, totalQuantity: Number(e.target.value)})}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Cost</label>
                      <input 
                        type="number"
                        className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                        value={newAsset.purchaseCost}
                        onChange={(e) => setNewAsset({...newAsset, purchaseCost: Number(e.target.value)})}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Low Stock Threshold</label>
                      <input 
                        type="number"
                        className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                        value={newAsset.lowStockThreshold}
                        onChange={(e) => setNewAsset({...newAsset, lowStockThreshold: Number(e.target.value)})}
                      />
                    </div>

                    <div className="md:col-span-2 pt-2">
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                      >
                        {loading ? 'Adding Asset...' : 'Add Asset to Inventory'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : null}
            </div>
          )}
        </div>

        {/* Recent Inventory Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit lg:sticky lg:top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center">
                <Package className="h-4 w-4 text-primary mr-2" />
                Current Stock
              </h2>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{inventory.length} Items</span>
            </div>

            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {inventory.length === 0 ? (
                <div className="text-center py-8 text-gray-400 italic text-xs">
                  No inventory records found.
                </div>
              ) : (
                inventory.map((item) => (
                  <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 group">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 bg-white rounded-lg shadow-sm flex items-center justify-center font-bold text-primary border border-gray-100 text-xs">
                        {item.itemName?.charAt(0) || 'P'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{item.itemName}</p>
                        <p className="text-[10px] font-medium text-gray-500 truncate">{item.assetId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black ${item.availableQuantity <= (item.lowStockThreshold || 5) ? 'text-red-600 animate-pulse flex items-center justify-end' : 'text-primary'}`}>
                        {item.availableQuantity <= (item.lowStockThreshold || 5) && <ShieldAlert className="h-3 w-3 mr-1" />}
                        {item.availableQuantity}
                      </p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{item.unit}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmUpdate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${confirmUpdate.type === 'IN' ? 'bg-primary-50 text-primary' : 'bg-accent-50 text-accent'}`}>
                {confirmUpdate.type === 'IN' ? <ArrowUpCircle className="h-6 w-6" /> : <ArrowDownCircle className="h-6 w-6" />}
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirm Stock {confirmUpdate.type === 'IN' ? 'In' : 'Out'}</h3>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Item Name:</span>
                <span className="text-gray-900 font-bold truncate ml-4">{confirmUpdate.asset.itemName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Asset ID:</span>
                <span className="text-gray-900 font-mono">{confirmUpdate.asset.assetId}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Current Stock:</span>
                <span className="text-gray-900 font-bold">{confirmUpdate.asset.availableQuantity} {confirmUpdate.asset.unit}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Movement:</span>
                <span className={`font-bold ${confirmUpdate.type === 'IN' ? 'text-primary' : 'text-accent'}`}>
                  {confirmUpdate.type === 'IN' ? '+' : '-'}{confirmUpdate.quantity} {confirmUpdate.asset.unit}
                </span>
              </div>
              <div className="flex justify-between text-xs border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Final Stock:</span>
                <span className="text-primary font-black">
                  {confirmUpdate.type === 'IN' ? confirmUpdate.asset.availableQuantity + confirmUpdate.quantity : confirmUpdate.asset.availableQuantity - confirmUpdate.quantity} {confirmUpdate.asset.unit}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setConfirmUpdate(null)}
                className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={performStockUpdate}
                disabled={loading}
                className={`py-2.5 text-white font-bold rounded-xl transition-all text-sm shadow-md ${
                  confirmUpdate.type === 'IN' ? 'bg-primary hover:bg-primary-700' : 'bg-accent hover:bg-accent-700'
                } disabled:opacity-50`}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehousePanel;
