import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';
import api from '../api/axios';
import Barcode from 'react-barcode';
import { 
  Eye,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus, 
  Search, 
  Package, 
  Filter, 
  LayoutGrid, 
  List as ListIcon, 
  ChevronRight, 
  ChevronDown,
  Info,
  IndianRupee,
  MapPin,
  Calendar,
  Activity,
  CheckCircle,
  AlertCircle,
  X,
  ShieldAlert,
  Barcode as BarcodeIcon,
  Edit2,
  Trash2
} from 'lucide-react';
import { ASSET_CATEGORIES, ASSET_STATUSES, ASSET_LOCATIONS, DEPARTMENTS, DEPT_FIELDS } from '../constants/assets';

const AssetManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [selectedDept, setSelectedDept] = useState('');
  
  const queryParams = new URLSearchParams(location.search);
  const viewOnlyMode = queryParams.get('mode') === 'view';
  const initialLowStock = queryParams.get('lowStock') === 'true';

  const canEdit = user?.role === ROLES.ADMIN || user?.role === ROLES.INVENTORY_MANAGER || user?.role === ROLES.WAREHOUSE;
  const canDelete = user?.role === ROLES.ADMIN;
  const canAdd = (user?.role === ROLES.ADMIN || user?.role === ROLES.INVENTORY_MANAGER || user?.role === ROLES.WAREHOUSE) && !viewOnlyMode;
  const canUpdateStock = user?.role === ROLES.ADMIN || user?.role === ROLES.INVENTORY_MANAGER || user?.role === ROLES.WAREHOUSE;
  
  // Filtering and Pagination State
  const [filterDept, setFilterDept] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(initialLowStock);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [, setDamagedCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [confirmUpdate, setConfirmUpdate] = useState(null); // { asset, type }
  const [viewAsset, setViewAsset] = useState(null); // Asset to show in detail modal
  const [barcodeAsset, setBarcodeAsset] = useState(null); // Asset to show barcode for
  const [assetToDelete, setAssetToDelete] = useState(null); // Asset to delete
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const itemsPerPage = 6;

  // Sync low stock filter with URL param changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isLowStock = params.get('lowStock') === 'true';
    setShowLowStockOnly(isLowStock);
  }, [location.search]);

  const [formData, setFormData] = useState({
    itemName: '',
    sku: '',
    category: 'hardware',
    department: '',
    subDepartment: '',
    totalQuantity: 1,
    allocatedQuantity: 0,
    lowStockThreshold: 5,
    unit: 'pcs',
    status: 'active',
    location: 'office',
    assignedTo: '',
    purchaseCost: 0,
    vendorName: '',
    invoiceNumber: '',
    purchaseDate: '',
    warrantyExpiry: '',
    maintenanceSchedule: '',
    metadata: {}
  });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        department: filterDept !== 'All' ? filterDept : undefined,
        search: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        lowStock: showLowStockOnly ? 'true' : undefined
      };
      
      const res = await api.get('/inventory', { params });
      setAssets(res.data.assets);
      setTotalPages(res.data.totalPages);
      setTotalAssets(res.data.totalAssets);
      setTotalValue(res.data.totalValue);
      setActiveCount(res.data.activeCount);
      setDamagedCount(res.data.damagedCount);
      setLowStockCount(res.data.lowStockCount);
    } catch (err) {
      console.error('Failed to fetch assets', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, endDate, filterDept, searchTerm, showLowStockOnly, startDate]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMetadataChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/inventory/update/${editId}`, formData);
      } else {
        await api.post('/inventory/add', formData);
      }
      setShowForm(false);
      setIsEditing(false);
      setEditId(null);
      setSelectedDept('');
      setCurrentPage(1); 
      fetchAssets();
      // Reset form
      setFormData({
        itemName: '',
        sku: '',
        category: 'hardware',
        department: '',
        subDepartment: '',
        totalQuantity: 1,
        allocatedQuantity: 0,
        lowStockThreshold: 5,
        unit: 'pcs',
        status: 'active',
        location: 'warehouse',
        assignedTo: '',
        purchaseCost: 0,
        vendorName: '',
        invoiceNumber: '',
        purchaseDate: '',
        warrantyExpiry: '',
        maintenanceSchedule: '',
        metadata: {}
      });
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'add'} asset`);
    }
  };

  const handleEdit = (asset) => {
    setFormData({
      itemName: asset.itemName || '',
      sku: asset.sku || '',
      category: asset.category || 'hardware',
      department: asset.department || '',
      subDepartment: asset.subDepartment || '',
      totalQuantity: asset.totalQuantity || 1,
      allocatedQuantity: asset.allocatedQuantity || 0,
      lowStockThreshold: asset.lowStockThreshold || 5,
      unit: asset.unit || 'pcs',
      status: asset.status || 'active',
      location: asset.location || 'warehouse',
      assignedTo: asset.assignedTo || '',
      purchaseCost: asset.purchaseCost || 0,
      vendorName: asset.vendorName || '',
      invoiceNumber: asset.invoiceNumber || '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
      maintenanceSchedule: asset.maintenanceSchedule || '',
      metadata: asset.metadata || {}
    });
    setEditId(asset._id);
    setIsEditing(true);
    setSelectedDept(asset.department);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (asset) => {
    setAssetToDelete(asset);
  };

  const performDelete = async () => {
    if (!assetToDelete) return;
    try {
      await api.delete(`/inventory/delete/${assetToDelete._id}`);
      setAssetToDelete(null);
      fetchAssets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete asset');
    }
  };

  const handleQuickStockUpdate = (asset, type) => {
    setConfirmUpdate({ asset, type });
  };

  const performStockUpdate = async () => {
    if (!confirmUpdate) return;
    const { asset, type } = confirmUpdate;
    try {
      await api.post('/inventory/update-stock', {
        sku: asset.assetId,
        quantityChange: 1,
        type: type
      });
      setConfirmUpdate(null);
      fetchAssets();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Asset Management</h1>
            <p className="text-xs text-gray-500 mt-0.5">Unified inventory system for all departments</p>
          </div>
          <div className="flex items-center gap-2">
            {canAdd && (
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setShowForm(!showForm);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${showForm ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
              >
                {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showForm ? 'Close Form' : 'Add Asset'}
              </button>
            )}
            <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Add Asset Section (On-Page) */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden animate-in slide-in-from-top-4 duration-300">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{isEditing ? 'Update Inventory Asset' : 'Register New Inventory Asset'}</h2>
                <p className="text-[10px] text-gray-500">{isEditing ? 'Modify the details of the existing asset' : 'Provide details for the new asset below'}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-6">
              {/* Department Selection First */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center">
                    <ChevronRight className="h-3 w-3 mr-1.5" /> Select Department
                  </h3>
                  {!selectedDept && <span className="text-[9px] bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-600 font-bold uppercase tracking-tighter animate-pulse">Required</span>}
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <select 
                    name="department" 
                    value={formData.department} 
                    onChange={(e) => { 
                      handleInputChange(e); 
                      setSelectedDept(e.target.value); 
                    }} 
                    className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm font-bold text-indigo-900 shadow-sm"
                  >
                    <option value="">-- Choose a Department --</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {selectedDept && (
                    <div className="flex items-center text-emerald-600 font-bold text-xs">
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Ready for {selectedDept}
                    </div>
                  )}
                </div>
              </div>

              {selectedDept ? (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                  {/* Section 1: Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Item Name</label>
                      <input name="itemName" required value={formData.itemName} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">SKU Number</label>
                      <input name="sku" placeholder="Auto-generated if empty" value={formData.sku} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Category</label>
                      <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                        {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status</label>
                      <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                        {ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Section 2: Quantities & Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Total</label>
                        <input type="number" name="totalQuantity" value={formData.totalQuantity} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Unit</label>
                        <input name="unit" value={formData.unit} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Threshold</label>
                        <input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Location</label>
                        <select name="location" value={formData.location} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                          {ASSET_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sub-Dept</label>
                        <input name="subDepartment" value={formData.subDepartment} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Financials */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cost</label>
                      <input type="number" name="purchaseCost" value={formData.purchaseCost} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vendor</label>
                      <input name="vendorName" value={formData.vendorName} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Purchase Date</label>
                      <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Warranty</label>
                      <input type="date" name="warrantyExpiry" value={formData.warrantyExpiry} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>

                  {/* Section 4: Dynamic Department Fields */}
                  <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                      <ChevronRight className="h-3 w-3 mr-1.5" /> {selectedDept} Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {DEPT_FIELDS[selectedDept]?.map(field => (
                        <div key={field.name}>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{field.label}</label>
                          {field.type === 'checkbox' ? (
                            <div className="flex items-center mt-2">
                              <input type="checkbox" name={field.name} checked={formData.metadata[field.name] || false} onChange={handleMetadataChange} className="h-4 w-4 rounded text-indigo-600 border-gray-300" />
                              <span className="ml-2 text-xs text-gray-500">Enable</span>
                            </div>
                          ) : (
                            <input type={field.type} name={field.name} value={formData.metadata[field.name] || ''} onChange={handleMetadataChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition-all transform active:scale-95">
                      Save Asset
                    </button>
                    <button type="button" onClick={() => { setShowForm(false); setSelectedDept(''); }} className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-500 py-2.5 rounded-xl font-bold text-sm transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
                  <Package className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm font-medium">Select a department to continue</p>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all duration-300">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Assets</p>
              <p className="text-xl font-black text-gray-900">{totalAssets}</p>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all duration-300">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Units</p>
              <p className="text-xl font-black text-gray-900">{activeCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-red-200 transition-all duration-300">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-colors">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Low Stock</p>
              <p className={`text-xl font-black ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStockCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all duration-300">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Value</p>
              <p className="text-xl font-black text-gray-900">{totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative col-span-1 md:col-span-1.5">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search inventory..." 
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            
            <div className="relative">
              <select 
                className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-sm font-bold text-gray-600 cursor-pointer"
                value={filterDept}
                onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input 
                type="date" 
                className="bg-transparent outline-none text-xs font-bold text-gray-600 w-full"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input 
                type="date" 
                className="bg-transparent outline-none text-xs font-bold text-gray-600 w-full"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <button 
              onClick={() => { setShowLowStockOnly(!showLowStockOnly); setCurrentPage(1); }}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all font-bold text-xs ${
                showLowStockOnly 
                  ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-100' 
                  : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'
              }`}
            >
              <ShieldAlert className={`h-4 w-4 ${showLowStockOnly ? 'animate-pulse' : ''}`} />
              Low Stock
            </button>
          </div>
        </div>

        {/* Asset Grid/List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {assets.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-400 italic bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-10" />
                  <p className="text-sm font-bold uppercase tracking-widest">No matching inventory</p>
                </div>
              ) : (
                assets.map(asset => (
                  <div key={asset._id} className={`bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300 ${viewMode === 'grid' ? 'rounded-2xl p-5' : 'rounded-xl p-3 flex items-center justify-between gap-4'}`}>
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${asset.availableQuantity <= (asset.lowStockThreshold || 5) ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-gray-900 text-sm truncate">{asset.itemName}</h3>
                        </div>
                        <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">
                          {asset.assetId} • {asset.category}
                        </div>
                      </div>
                    </div>

                    <div className={viewMode === 'grid' ? "mt-4 grid grid-cols-2 gap-3 border-t border-gray-50 pt-4" : "flex items-center space-x-6 flex-shrink-0"}>
                      <div className="hidden md:flex items-center text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                        <MapPin className="h-3 w-3 mr-1.5 opacity-40" />
                        {asset.location}
                      </div>
                      
                      <div className="flex items-center">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight ${
                          asset.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 
                          asset.status === 'damaged' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {asset.status}
                        </span>
                      </div>

                      <div className="flex flex-col items-end min-w-[80px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-black ${asset.availableQuantity <= (asset.lowStockThreshold || 5) ? 'text-red-600' : 'text-gray-900'}`}>
                            {asset.availableQuantity}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">/ {asset.totalQuantity}</span>
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase leading-none">{asset.unit}</p>
                      </div>
                      
                      {/* Quick Actions for List View */}
                      {viewMode === 'list' && (
                        <div className="flex items-center gap-1 ml-2">
                          <button 
                            onClick={() => setViewAsset(asset)}
                            title="View Details"
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setBarcodeAsset(asset)}
                            title="View Barcode"
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <BarcodeIcon className="h-4 w-4" />
                          </button>
                          {canEdit && (
                            <button 
                              onClick={() => handleEdit(asset)}
                              title="Edit Item"
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={() => handleDelete(asset)}
                              title="Delete Item"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          <div className="h-4 w-px bg-gray-100 mx-1"></div>
                          {canUpdateStock && (
                            <>
                              <button 
                                onClick={() => handleQuickStockUpdate(asset, 'IN')}
                                className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                              >
                                <ArrowUpCircle className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleQuickStockUpdate(asset, 'OUT')}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <ArrowDownCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-12 space-x-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Previous
                </button>
                <div className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl text-sm border border-indigo-100">
                  Page {currentPage} of {totalPages}
                </div>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {/* Confirmation Modal */}
      {confirmUpdate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${confirmUpdate.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {confirmUpdate.type === 'IN' ? <ArrowUpCircle className="h-6 w-6" /> : <ArrowDownCircle className="h-6 w-6" />}
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirm Stock {confirmUpdate.type === 'IN' ? 'Increase' : 'Decrease'}</h3>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Item Name:</span>
                <span className="text-gray-900 font-bold">{confirmUpdate.asset.itemName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Asset ID:</span>
                <span className="text-gray-900 font-mono">{confirmUpdate.asset.assetId}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-gray-200 pt-2">
                <span className="text-gray-500 font-medium">Current Stock:</span>
                <span className="text-gray-900 font-bold">{confirmUpdate.asset.availableQuantity} {confirmUpdate.asset.unit}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Action:</span>
                <span className={`font-bold ${confirmUpdate.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {confirmUpdate.type === 'IN' ? '+1' : '-1'} Unit
                </span>
              </div>
              <div className="flex justify-between text-xs border-t border-gray-200 pt-2">
                <span className="text-gray-500 font-medium">New Stock:</span>
                <span className="text-indigo-600 font-black">
                  {confirmUpdate.type === 'IN' ? confirmUpdate.asset.availableQuantity + 1 : confirmUpdate.asset.availableQuantity - 1} {confirmUpdate.asset.unit}
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
                className={`py-2.5 text-white font-bold rounded-xl transition-all text-sm shadow-md ${
                  confirmUpdate.type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Asset Detail Modal */}
      {viewAsset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">{viewAsset.itemName}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Asset Details • {viewAsset.assetId}</p>
                </div>
              </div>
              <button onClick={() => setViewAsset(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Available</p>
                  <p className="text-2xl font-black text-indigo-600">{viewAsset.availableQuantity} <span className="text-xs font-bold opacity-60">{viewAsset.unit}</span></p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Stock</p>
                  <p className="text-2xl font-black text-gray-900">{viewAsset.totalQuantity}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Threshold</p>
                  <p className="text-2xl font-black text-gray-900">{viewAsset.lowStockThreshold || 5}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    viewAsset.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>{viewAsset.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">General Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2"><LayoutGrid className="h-4 w-4 opacity-40" /> Category</span>
                      <span className="font-bold text-gray-900">{viewAsset.category}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2"><Filter className="h-4 w-4 opacity-40" /> Department</span>
                      <span className="font-bold text-gray-900">{viewAsset.department}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2"><MapPin className="h-4 w-4 opacity-40" /> Location</span>
                      <span className="font-bold text-gray-900">{viewAsset.location}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Financials</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2"><IndianRupee className="h-4 w-4 opacity-40" /> Cost</span>
                      <span className="font-bold text-gray-900">₹{viewAsset.purchaseCost?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2"><Calendar className="h-4 w-4 opacity-40" /> Purchase Date</span>
                      <span className="font-bold text-gray-900">{viewAsset.purchaseDate ? new Date(viewAsset.purchaseDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {viewAsset.metadata && Object.keys(viewAsset.metadata).length > 0 && (
                <div className="space-y-4 pt-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Technical Metadata</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                    {Object.entries(viewAsset.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-bold text-gray-900">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setViewAsset(null);
                  handleQuickStockUpdate(viewAsset, 'IN');
                }}
                className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all text-sm shadow-md"
              >
                Stock In (+1)
              </button>
              <button 
                onClick={() => setViewAsset(null)}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-all text-sm shadow-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Modal */}
      {barcodeAsset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Item Barcode</h3>
                <button onClick={() => setBarcodeAsset(null)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-inner flex flex-col items-center">
                <Barcode 
                  value={barcodeAsset.sku || barcodeAsset.assetId} 
                  width={1.5} 
                  height={60} 
                  fontSize={12}
                  background="#ffffff"
                />
                <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{barcodeAsset.itemName}</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => window.print()} 
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Print Label
                </button>
                <button 
                  onClick={() => setBarcodeAsset(null)}
                  className="w-full py-3 bg-gray-50 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="p-2 bg-red-50 rounded-lg">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Confirm Deletion</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-bold text-gray-900">{assetToDelete.itemName}</span>? 
              This action cannot be undone and will remove all associated inventory records.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setAssetToDelete(null)}
                className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={performDelete}
                className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all text-sm shadow-md shadow-red-100"
              >
                Delete Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;
