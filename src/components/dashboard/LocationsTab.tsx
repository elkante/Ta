import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  Sparkles,
  Truck,
  Store as StoreIcon,
  HelpCircle,
  X,
  AlertCircle,
} from 'lucide-react';
import { Store, StoreDeliveryLocation } from '../../types';
import { getStoreDeliveryLocations, saveStoreDeliveryLocations } from '../../utils/storage';
import { NIGERIAN_STATES, ALL_NIGERIAN_STATE_NAMES, getStateByName } from '../../utils/nigeriaStates';

interface LocationsTabProps {
  store: Store;
}

export const LocationsTab: React.FC<LocationsTabProps> = ({ store }) => {
  const [locations, setLocations] = useState<StoreDeliveryLocation[]>(() =>
    getStoreDeliveryLocations(store.id)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<StoreDeliveryLocation | null>(null);

  // Form state
  const [selectedState, setSelectedState] = useState<string>('Lagos');
  const [areaName, setAreaName] = useState<string>('');
  const [fee, setFee] = useState<number>(2500);
  const [estimatedDays, setEstimatedDays] = useState<string>('Same-day delivery');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveLocations = (newList: StoreDeliveryLocation[]) => {
    setLocations(newList);
    saveStoreDeliveryLocations(store.id, newList);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleOpenAdd = () => {
    setEditingLoc(null);
    setSelectedState('Lagos');
    setAreaName('');
    setFee(2500);
    setEstimatedDays('Same-day or next-day');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loc: StoreDeliveryLocation) => {
    setEditingLoc(loc);
    setSelectedState(loc.state);
    setAreaName(loc.areaName);
    setFee(loc.fee);
    setEstimatedDays(loc.estimatedDays || '1 - 2 business days');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = locations.filter((l) => l.id !== id);
    handleSaveLocations(updated);
  };

  const handleToggleActive = (id: string) => {
    const updated = locations.map((l) =>
      l.id === id ? { ...l, isActive: !l.isActive } : l
    );
    handleSaveLocations(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName.trim()) return;

    if (editingLoc) {
      const updated = locations.map((l) =>
        l.id === editingLoc.id
          ? {
              ...l,
              state: selectedState,
              areaName: areaName.trim(),
              fee: Number(fee),
              estimatedDays: estimatedDays.trim() || undefined,
            }
          : l
      );
      handleSaveLocations(updated);
    } else {
      const newLoc: StoreDeliveryLocation = {
        id: `loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        storeId: store.id,
        state: selectedState,
        areaName: areaName.trim(),
        fee: Number(fee),
        estimatedDays: estimatedDays.trim() || undefined,
        isActive: true,
      };
      handleSaveLocations([...locations, newLoc]);
    }

    setIsModalOpen(false);
  };

  const handleStateChange = (stateName: string) => {
    setSelectedState(stateName);
    const info = getStateByName(stateName);
    if (info) {
      setFee(info.defaultFee);
    }
  };

  const handleQuickAddPopular = (area: string) => {
    setAreaName(area);
  };

  const handleLoadNationwideDefaults = () => {
    const defaults: StoreDeliveryLocation[] = [
      {
        id: `loc_lag_isl_${Date.now()}`,
        storeId: store.id,
        state: 'Lagos',
        areaName: 'Lagos Island / Victoria Island / Ikoyi',
        fee: 2500,
        estimatedDays: 'Same-day or next-day',
        isActive: true,
      },
      {
        id: `loc_lag_lek_${Date.now()}`,
        storeId: store.id,
        state: 'Lagos',
        areaName: 'Lekki Phase 1 / Oniru / Chevron',
        fee: 2500,
        estimatedDays: 'Same-day or next-day',
        isActive: true,
      },
      {
        id: `loc_lag_main_${Date.now()}`,
        storeId: store.id,
        state: 'Lagos',
        areaName: 'Lagos Mainland (Ikeja, Surulere, Yaba, Maryland)',
        fee: 2000,
        estimatedDays: 'Same-day or next-day',
        isActive: true,
      },
      {
        id: `loc_abj_cbd_${Date.now()}`,
        storeId: store.id,
        state: 'Abuja (FCT)',
        areaName: 'Central Abuja (Maitama, Wuse 2, Garki, Jabi)',
        fee: 3500,
        estimatedDays: '1 - 2 business days',
        isActive: true,
      },
      {
        id: `loc_ph_gra_${Date.now()}`,
        storeId: store.id,
        state: 'Rivers (Port Harcourt)',
        areaName: 'Port Harcourt (Old GRA, New GRA, Peter Odili)',
        fee: 4000,
        estimatedDays: '1 - 2 business days',
        isActive: true,
      },
      {
        id: `loc_ibadan_${Date.now()}`,
        storeId: store.id,
        state: 'Oyo (Ibadan)',
        areaName: 'Ibadan City (Bodija, Ring Road, Dugbe)',
        fee: 3500,
        estimatedDays: '1 - 2 business days',
        isActive: true,
      },
      {
        id: `loc_interstate_${Date.now()}`,
        storeId: store.id,
        state: 'Other Nigerian States',
        areaName: 'Interstate Nationwide Park Delivery',
        fee: 4500,
        estimatedDays: '2 - 4 business days',
        isActive: true,
      },
    ];
    handleSaveLocations(defaults);
  };

  const selectedStateInfo = getStateByName(selectedState);

  const filteredLocations = locations.filter((loc) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      loc.state.toLowerCase().includes(q) ||
      loc.areaName.toLowerCase().includes(q) ||
      (loc.estimatedDays && loc.estimatedDays.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner — Orderly 'Where you deliver' inspired */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-700/60">
        <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Delivery Zones
              </span>
              <span className="text-slate-400 text-xs">· Nigeria-wide coverage</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Where you deliver</span>
              <span className="text-sm font-black bg-white/10 text-white px-3 py-1 rounded-full border border-white/15">
                {locations.length} active areas
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Add the places you deliver to and what you charge. Customers pick from this exact list when they check out on your storefront.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleLoadNationwideDefaults}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/15 cursor-pointer"
              title="Preload recommended hubs for Lagos, Abuja, Port Harcourt & Interstate"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Preset Hubs</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Delivery Area</span>
            </button>
          </div>
        </div>

        {/* 3-Step Guide Banner like Orderly */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/10">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <span className="font-bold text-white block">Pick a State</span>
              <span className="text-slate-300 text-[11px]">All 36 Nigerian States + FCT</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/10">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <span className="font-bold text-white block">Add Specific Areas</span>
              <span className="text-slate-300 text-[11px]">Island, Mainland, or Town</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/10">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <span className="font-bold text-white block">Set Delivery Fee</span>
              <span className="text-slate-300 text-[11px]">Auto-calculated at checkout</span>
            </div>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Delivery locations updated successfully! Changes are live on your storefront checkout.</span>
        </div>
      )}

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search delivery areas by state or name..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs font-semibold text-slate-500 px-2">
          {filteredLocations.length} {filteredLocations.length === 1 ? 'zone' : 'zones'} configured
        </div>
      </div>

      {/* Locations Grid */}
      {filteredLocations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Truck className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No delivery locations found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Try searching with another keyword.'
              : 'Add the delivery areas you service in Nigeria with your custom delivery pricing.'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenAdd}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Location</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((loc) => (
            <div
              key={loc.id}
              className={`bg-white rounded-2xl border p-4.5 shadow-2xs transition flex flex-col justify-between space-y-3 ${
                loc.isActive
                  ? 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                  : 'border-slate-200 bg-slate-50/60 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {loc.state}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm leading-snug pt-1">
                      {loc.areaName}
                    </h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={loc.isActive}
                      onChange={() => handleToggleActive(loc.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Delivery Fee</span>
                    <span className="text-base font-black font-mono text-emerald-800">
                      {loc.fee === 0 ? 'FREE' : `${store.currencySymbol}${loc.fee.toLocaleString()}`}
                    </span>
                  </div>

                  {loc.estimatedDays && (
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Estimated Transit</span>
                      <span className="text-xs font-semibold text-slate-600">
                        {loc.estimatedDays}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(loc)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(loc.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Delete zone"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Location Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 z-10 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingLoc ? 'Edit Delivery Location' : 'Add Delivery Location'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* State Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nigerian State *
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  {ALL_NIGERIAN_STATE_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                  <option value="Other Nigerian States">Other Nigerian States (Interstate)</option>
                </select>
              </div>

              {/* Quick Area Chips if present */}
              {selectedStateInfo && selectedStateInfo.popularAreas.length > 0 && (
                <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Quick Select Popular Area:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pt-0.5">
                    {selectedStateInfo.popularAreas.map((area) => (
                      <button
                        type="button"
                        key={area}
                        onClick={() => handleQuickAddPopular(area)}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                          areaName === area
                            ? 'bg-slate-900 text-white border-slate-900 font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Area Name Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Area / Zone Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lekki Phase 1 / Oniru / Ikoyi"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Fee & Transit Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Delivery Fee ({store.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="2500"
                    value={fee}
                    onChange={(e) => setFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Set 0 for Free Delivery</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Estimated Transit
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Same-day delivery"
                    value={estimatedDays}
                    onChange={(e) => setEstimatedDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
                >
                  {editingLoc ? 'Save Zone Changes' : 'Add Delivery Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
