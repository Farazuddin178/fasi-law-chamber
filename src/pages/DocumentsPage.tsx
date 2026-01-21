import { useEffect, useState } from 'react';
import { supabase, Document, Case } from '@/lib/supabase';
import { Upload, FileText, Download, Trash, Filter, X, File, FileImage, CheckCircle, Clock, Eye, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = 'https://hugtbhdqcxjumljglbnc.supabase.co';
const STORAGE_BUCKET = 'documents';

interface DocumentWithStatus extends Document {
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  rejection_reason?: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentWithStatus[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Filter states
  const [caseFilter, setCaseFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Upload form state
  const [uploadData, setUploadData] = useState({
    case_id: '',
    category: 'case_document',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    setIsAdmin(user?.role === 'admin' || user?.role === 'restricted_admin');
    loadInitialData();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [documents, caseFilter, categoryFilter, statusFilter, searchTerm]);

  const loadInitialData = async () => {
    await Promise.all([loadDocuments(), loadCases()]);
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadCases = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('id, case_number, status, created_by, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases((data || []) as Case[]);
    } catch (error: any) {
      console.error('Failed to load cases:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...documents];

    if (caseFilter !== 'all') {
      filtered = filtered.filter(doc => doc.case_id === caseFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(doc => doc.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter(doc => 
        doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDocuments(filtered);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/jpg',
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, DOC, DOCX, and image files are allowed');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);

    try {
      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      // Save document metadata to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          case_id: uploadData.case_id || null,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          category: uploadData.category,
          description: uploadData.description || null,
          uploaded_by: user?.id,
        });

      if (dbError) {
        // If database insert fails, delete the uploaded file
        await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
        throw dbError;
      }

      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      resetUploadForm();
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Document downloaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download document');
    }
  };

  const handleDelete = async (document: Document) => {
    if (!confirm(`Are you sure you want to delete "${document.file_name}"?`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      toast.success('Document deleted successfully');
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete document');
    }
  };

  const resetUploadForm = () => {
    setUploadData({
      case_id: '',
      category: 'case_document',
      description: '',
    });
    setSelectedFile(null);
  };

  const handleApprove = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId);

      if (error) throw error;
      toast.success('Document approved');
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve document');
    }
  };

  const handleReject = async (docId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId);

      if (error) throw error;
      toast.success('Document rejected');
      setRejectionReason('');
      setSelectedDocument(null);
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject document');
    }
  };

  const handleSubmitForApproval = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'pending_approval',
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId);

      if (error) throw error;
      toast.success('Document submitted for approval');
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit document');
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="w-5 h-5" />;
    
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-600" />;
    if (fileType.includes('image')) return <FileImage className="w-5 h-5 text-blue-600" />;
    return <FileText className="w-5 h-5 text-gray-600" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
  };

  const getCategoryLabel = (category?: string) => {
    const categories: Record<string, string> = {
      case_document: 'Case Document',
      evidence: 'Evidence',
      court_order: 'Court Order',
      legal_notice: 'Legal Notice',
      contract: 'Contract',
      other: 'Other',
    };
    return categories[category || 'other'] || 'Unknown';
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'draft':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1">Manage case documents and files</p>
        </div>
        <button
          onClick={() => {
            resetUploadForm();
            setShowUploadModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Upload className="w-5 h-5" />
          Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Case</label>
            <select
              value={caseFilter}
              onChange={(e) => setCaseFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Cases</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="case_document">Case Document</option>
              <option value="evidence">Evidence</option>
              <option value="court_order">Court Order</option>
              <option value="legal_notice">Legal Notice</option>
              <option value="contract">Contract</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No documents found</p>
            <p className="text-gray-400 text-sm mt-2">Upload your first document to get started</p>
          </div>
        ) : (
          filteredDocuments.map((document) => {
            const linkedCase = cases.find(c => c.id === document.case_id);
            
            return (
              <div
                key={document.id}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getFileIcon(document.file_type)}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {document.file_name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(document.file_size)}
                      </p>
                    </div>
                  </div>
                </div>

                {document.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {document.description}
                  </p>
                )}

                <div className="space-y-2 text-xs text-gray-500 mb-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Category:</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {getCategoryLabel(document.category)}
                    </span>
                  </div>
                  {linkedCase && (
                    <div className="flex justify-between">
                      <span className="font-medium">Case:</span>
                      <span>{linkedCase.case_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium">Uploaded:</span>
                    <span>{new Date(document.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(document)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(document)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete Document"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {/* File Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select File <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    required
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600">Click to select a file</p>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, DOC, DOCX, JPG, PNG (max 50MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Case (Optional)
                </label>
                <select
                  value={uploadData.case_id}
                  onChange={(e) => setUploadData({ ...uploadData, case_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No case linked</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={uploadData.category}
                  onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="case_document">Case Document</option>
                  <option value="evidence">Evidence</option>
                  <option value="court_order">Court Order</option>
                  <option value="legal_notice">Legal Notice</option>
                  <option value="contract">Contract</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter document description"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Document
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
