import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase, Case } from "@/lib/supabase";
import { TableVirtuoso } from "react-virtuoso";
import { Plus, Eye, Edit, Trash, Download, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Only the columns needed for the list view.
 * Heavy JSON arrays (orders, ia_details, vakalath, lower_court_details,
 * petitioners, respondents, prayer, memo, subject…) are excluded.
 * They are fetched on-demand in CaseDetailsPage.
 */
const LIST_COLUMNS = [
  "id",
  "case_number",
  "flc_number",
  "cnr",
  "primary_petitioner",
  "primary_respondent",
  "status",
  "hearing_date",
  "mention_date",
  "return_date",
  "listing_date",
  "created_at",
].join(",");

const PAGE_SIZE = 50;

type CaseListRow = Pick<
  Case,
  | "id"
  | "case_number"
  | "flc_number"
  | "cnr"
  | "primary_petitioner"
  | "primary_respondent"
  | "status"
  | "hearing_date"
  | "mention_date"
  | "return_date"
  | "listing_date"
  | "created_at"
>;

export default function CasesPage() {
  // Accumulated rows — new pages are appended on scroll
  const [cases, setCases] = useState<CaseListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateTypeFilter, setDateTypeFilter] = useState<"all" | "mention" | "hearing" | "listing">("all");
  const nextPageRef = useRef(0);
  const { user } = useAuth();
  const location = useLocation();

  // ── Core query — appends results to the accumulated list ─────────────────
  const loadPage = useCallback(
    async (page: number, reset: boolean) => {
      setLoading(true);
      try {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("cases")
          .select(LIST_COLUMNS, { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);

        if (statusFilter !== "all") query = query.eq("status", statusFilter);

        if (searchTerm.trim()) {
          const t = `%${searchTerm.trim()}%`;
          query = query.or(
            `case_number.ilike.${t},primary_petitioner.ilike.${t},primary_respondent.ilike.${t},cnr.ilike.${t},flc_number.ilike.${t}`
          );
        }

        // All four date columns now exist in the DB after running the migration
        if (dateTypeFilter === "mention") query = query.not("mention_date", "is", null);
        else if (dateTypeFilter === "hearing") query = query.not("hearing_date", "is", null);
        else if (dateTypeFilter === "listing") query = query.not("listing_date", "is", null);

        const { data, error, count } = await query;
        if (error) throw error;

        const rows = (data as CaseListRow[]) || [];
        setCases((prev) => (reset ? rows : [...prev, ...rows]));
        setTotalCount(count ?? 0);
        setHasMore(rows.length === PAGE_SIZE);
        nextPageRef.current = page + 1;
      } catch (err: any) {
        toast.error(err.message || "Failed to load cases");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, statusFilter, dateTypeFilter]
  );

  // Reset list when filters change
  useEffect(() => {
    nextPageRef.current = 0;
    loadPage(0, true);
  }, [loadPage]);

  // Reload on navigate back
  useEffect(() => {
    if (location.pathname === "/cases") {
      nextPageRef.current = 0;
      loadPage(0, true);
    }
  }, [location.pathname]);

  // TableVirtuoso calls this when user scrolls near the bottom
  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) {
      loadPage(nextPageRef.current, false);
    }
  }, [loading, hasMore, loadPage]);

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
  };

  const deleteCase = async (id: string) => {
    if (!confirm("Are you sure you want to delete this case?")) return;
    try {
      const { error } = await supabase.from("cases").delete().eq("id", id);
      if (error) throw error;
      toast.success("Case deleted");
      setCases((prev) => prev.filter((c) => c.id !== id));
      setTotalCount((n) => n - 1);
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleBulkExport = async () => {
    toast("Fetching all cases for export\u2026");
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const blob = new Blob(
        [JSON.stringify({ export_date: new Date().toISOString(), total_cases: data?.length || 0, cases: data || [] }, null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), {
        href: url,
        download: `all-cases-export-${new Date().toISOString().split("T")[0]}.json`,
      }).click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data?.length || 0} cases`);
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }
  };

  const canEdit = user?.role === "admin" || user?.role === "restricted_admin";
  const canDelete = user?.role === "admin";

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cases</h1>
          <p className="text-gray-600 mt-1">
            {loading && cases.length === 0
              ? "Loading\u2026"
              : `${cases.length.toLocaleString()} of ${totalCount.toLocaleString()} loaded`}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleBulkExport}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-5 h-5" />
            Export All ({totalCount.toLocaleString()})
          </button>
          {canEdit && (
            <Link
              to="/cases/new"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Case
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-300">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search case number, petitioner, respondent, CNR\u2026"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-gray-700"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="filed">Filed</option>
            <option value="disposed">Disposed</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={dateTypeFilter}
            onChange={(e) => setDateTypeFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Date Types</option>
            <option value="mention">Has Mention Date</option>
            <option value="hearing">Has Hearing Date</option>
            <option value="listing">Has Listing Date</option>
          </select>
        </div>
      </div>

      {/* Virtualized table — only visible rows are in the DOM */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 min-h-0">
        {loading && cases.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : cases.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No cases found{searchTerm ? ` matching \u201c${searchTerm}\u201d` : ""}
          </div>
        ) : (
          <TableVirtuoso
            style={{ height: "100%" }}
            data={cases}
            endReached={handleEndReached}
            overscan={200}
            fixedHeaderContent={() => (
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Case Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[22%]">Petitioner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[22%]">Respondent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[11%]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">Dates</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">Actions</th>
              </tr>
            )}
            itemContent={(_index, caseItem) => (
              <>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{caseItem.case_number}</td>
                <td className="px-4 py-3 text-sm text-gray-500 break-words">{caseItem.primary_petitioner || "-"}</td>
                <td className="px-4 py-3 text-sm text-gray-500 break-words">{caseItem.primary_respondent || "-"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      caseItem.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : caseItem.status === "filed"
                        ? "bg-blue-100 text-blue-800"
                        : caseItem.status === "disposed"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {caseItem.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  <div className="space-y-0.5">
                    <div className="flex justify-between gap-1"><span className="text-gray-400">Mention</span><span className="font-medium">{formatDate(caseItem.mention_date || caseItem.return_date)}</span></div>
                    <div className="flex justify-between gap-1"><span className="text-gray-400">Hearing</span><span className="font-medium">{formatDate(caseItem.hearing_date || caseItem.listing_date)}</span></div>
                    <div className="flex justify-between gap-1"><span className="text-gray-400">Listing</span><span className="font-medium">{formatDate(caseItem.listing_date)}</span></div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <Link to={`/cases/${caseItem.id}`} className="text-blue-600 hover:text-blue-900"><Eye className="w-5 h-5" /></Link>
                    {canEdit && <Link to={`/cases/${caseItem.id}/edit`} className="text-green-600 hover:text-green-900"><Edit className="w-5 h-5" /></Link>}
                    {canDelete && <button onClick={() => deleteCase(caseItem.id)} className="text-red-600 hover:text-red-900"><Trash className="w-5 h-5" /></button>}
                  </div>
                </td>
              </>
            )}
            components={{
              TableFoot: () =>
                loading ? (
                  <tfoot>
                    <tr>
                      <td colSpan={6} className="py-4 text-center">
                        <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                      </td>
                    </tr>
                  </tfoot>
                  <tfoot>
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-xs text-gray-400">
                        All {totalCount.toLocaleString()} cases loaded
                      </td>
                    </tr>
                  </tfoot>
                ) : null,
            }}
          />
        )}
      </div>
    </div>
  );
}
