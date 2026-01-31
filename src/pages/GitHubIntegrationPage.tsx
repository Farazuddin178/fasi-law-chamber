import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Github, Download, Upload, Settings, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface GitHubSettings {
  repo_owner: string;
  repo_name: string;
  access_token: string;
  sync_enabled: boolean;
  last_sync?: string;
}

export default function GitHubIntegrationPage() {
  const [settings, setSettings] = useState<GitHubSettings>({
    repo_owner: '',
    repo_name: '',
    access_token: '',
    sync_enabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'admin') {
      loadGitHubSettings();
    }
  }, [user]);

  const loadGitHubSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('github_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          repo_owner: data.repo_owner || '',
          repo_name: data.repo_name || '',
          access_token: '', // Don't show token for security
          sync_enabled: data.sync_enabled || false,
          last_sync: data.last_sync
        });
      }
    } catch (error: any) {
      console.error('Failed to load GitHub settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settings.repo_owner || !settings.repo_name) {
      toast.error('Repository owner and name are required');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from('github_settings').upsert({
        id: 1,
        repo_owner: settings.repo_owner,
        repo_name: settings.repo_name,
        access_token_encrypted: settings.access_token, // In production, encrypt this
        sync_enabled: settings.sync_enabled,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      toast.success('GitHub settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportToGitHub = async () => {
    if (!settings.repo_owner || !settings.repo_name || !settings.access_token) {
      toast.error('Please configure GitHub settings first');
      return;
    }

    setExporting(true);

    try {
      // Export all cases as JSON
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;

      // Create JSON export
      const exportData = {
        export_date: new Date().toISOString(),
        total_cases: cases?.length || 0,
        cases: cases || []
      };

      // In a real implementation, you would use the GitHub API here
      // For now, we'll download the JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `legal-cases-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Update last sync time
      await supabase.from('github_settings').upsert({
        id: 1,
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      toast.success(`Exported ${cases?.length || 0} cases successfully`);
      loadGitHubSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleImportFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.cases || !Array.isArray(importData.cases)) {
        throw new Error('Invalid import file format');
      }

      // Import cases (in real implementation, handle conflicts)
      let imported = 0;
      for (const caseData of importData.cases) {
        // Remove id to let database generate new ones
        const { id, ...caseWithoutId } = caseData;
        
        // Ensure created_by is valid (use current admin if not present or invalid)
        const payload = {
            ...caseWithoutId,
            created_by: user?.id || caseWithoutId.created_by,
            updated_at: new Date().toISOString() 
        };

        const { error } = await supabase
          .from('cases')
          .insert(payload);

        if (!error) imported++;
      }

      toast.success(`Successfully imported ${imported} cases`);
      loadGitHubSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only administrators can access GitHub integration.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">GitHub Integration</h1>
        <p className="text-gray-600 mt-1">Backup and manage large datasets with GitHub</p>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <Github className="w-6 h-6 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-900">GitHub Configuration</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repository Owner (Username or Organization)
              </label>
              <input
                type="text"
                value={settings.repo_owner}
                onChange={(e) => setSettings({ ...settings, repo_owner: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your-username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repository Name
              </label>
              <input
                type="text"
                value={settings.repo_name}
                onChange={(e) => setSettings({ ...settings, repo_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="legal-case-backups"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={settings.access_token}
              onChange={(e) => setSettings({ ...settings, access_token: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ghp_xxxxxxxxxxxx"
            />
            <p className="text-xs text-gray-500 mt-1">
              Create a token at: github.com/settings/tokens (needs 'repo' scope)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sync_enabled"
              checked={settings.sync_enabled}
              onChange={(e) => setSettings({ ...settings, sync_enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="sync_enabled" className="text-sm font-medium text-gray-700">
              Enable automatic sync
            </label>
          </div>

          {settings.last_sync && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Last sync: {new Date(settings.last_sync).toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Settings className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>

      {/* Export/Import Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-bold text-gray-900">Export Cases</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Export all cases as JSON file. Can be uploaded to GitHub or saved locally for backup.
          </p>
          <button
            onClick={handleExportToGitHub}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export to JSON
              </>
            )}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Import Cases</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Import cases from a previously exported JSON file. Useful for data migration or restore.
          </p>
          <label className="w-full block">
            <input
              type="file"
              accept=".json"
              onChange={handleImportFromFile}
              disabled={importing}
              className="hidden"
            />
            <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer disabled:opacity-50">
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import from JSON
                </>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Usage Guide */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">GitHub Integration Guide</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-1">Step 1: Create GitHub Repository</h4>
            <p>Create a private repository on GitHub to store your case data backups.</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-1">Step 2: Generate Access Token</h4>
            <p>Go to GitHub Settings → Developer settings → Personal access tokens → Generate new token (with 'repo' scope)</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-1">Step 3: Configure Settings</h4>
            <p>Enter your repository details and access token in the form above.</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-1">Step 4: Export & Backup</h4>
            <p>Use the Export button to download case data, then commit to your GitHub repository.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
