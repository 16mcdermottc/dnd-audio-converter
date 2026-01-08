import React, { useState } from 'react';
import { MasonryGrid } from './MasonryGrid';
import { ArrowLeft, Plus, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GenericEditableListProps<T> {
  title: string;
  subTitle?: string;
  icon?: React.ReactNode;
  backLink?: string;
  backLabel?: string;
  
  items: T[];
  filterFunction?: (item: T, filter: string) => boolean;
  
  renderItem: (item: T, onEdit: () => void, onDelete: () => void) => React.ReactNode;
  renderForm: (
      formData: Partial<T> | null, 
      onChange: (data: Partial<T>) => void, 
      onSave: () => void, 
      onCancel: () => void
  ) => React.ReactNode;
  
  onSave: (data: Partial<T>, id?: number | string) => void;
  onDelete: (item: T) => void;
  
  isLoading?: boolean;
  emptyMessage?: string;
  
  initialFormData: () => Partial<T>;
  mapItemToFormData?: (item: T) => Partial<T>;
  getId: (item: T) => number | string;
  maxColumns?: number;
}

export function GenericEditableList<T>({
  title,
  subTitle,
  icon,
  backLink,
  backLabel = "Back",
  items,
  filterFunction,
  renderItem,
  renderForm,
  onSave,
  onDelete,
  isLoading,
  emptyMessage = "No items found.",
  initialFormData,
  mapItemToFormData,
  getId,
  maxColumns,
}: GenericEditableListProps<T>) {
  
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [formData, setFormData] = useState<Partial<T>>(initialFormData());

  const handleEdit = (item: T) => {
      setEditingItem(item);
      setFormData(mapItemToFormData ? mapItemToFormData(item) : (item as unknown as Partial<T>));
      setIsCreating(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = () => {
      onSave(formData, editingItem ? getId(editingItem) : undefined);
      handleCancel();
  };

  const handleCancel = () => {
      setIsCreating(false);
      setEditingItem(null);
      setFormData(initialFormData());
  };

  const handleDelete = (item: T) => {
      if(window.confirm("Are you sure you want to delete this item?")) {
          onDelete(item);
      }
  };

  const filteredItems = filterFunction 
      ? items.filter(item => filterFunction(item, search))
      : items;

  if (isLoading) return <div className="p-12 text-center text-slate-500">Loading...</div>;

  return (
    <div className="py-8 px-8 w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
            {backLink && (
                <Link to={backLink} className="text-slate-400 hover:text-white flex items-center mb-2 transition-colors">
                    <ArrowLeft size={16} className="mr-2" /> {backLabel}
                </Link>
            )}
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                {icon}
                {title}
            </h1>
            {subTitle && <p className="text-slate-400 mt-1">{subTitle}</p>}
        </div>

        <button 
            onClick={() => { setIsCreating(!isCreating); setEditingItem(null); setFormData(initialFormData()); }}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-lg shadow-purple-900/20 transition-all"
        >
            {isCreating ? <X size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
            {isCreating ? "Cancel" : "Add New"}
        </button>
      </div>

      {/* Form Area */}
      {isCreating && (
          <div className="mb-8 bg-slate-800 border border-slate-700 rounded-xl p-6 animate-in slide-in-from-top-4">
              <h2 className="text-xl font-bold text-white mb-4">{editingItem ? 'Edit Item' : 'New Item'}</h2>
              {renderForm(formData, setFormData, handleSave, handleCancel)}
          </div>
      )}

      {/* Search */}
      <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
      </div>

      {/* List Grid */}
      <MasonryGrid<T> 
          items={filteredItems}
          maxColumns={maxColumns}
          renderItem={(item) => (
             <React.Fragment key={getId(item)}>
                  {renderItem(item, () => handleEdit(item), () => handleDelete(item))}
              </React.Fragment>
          )}
      />

      {filteredItems.length === 0 && (
          <div className="text-center py-12 text-slate-500 italic">
              {emptyMessage}
          </div>
      )}
    </div>
  );
}
