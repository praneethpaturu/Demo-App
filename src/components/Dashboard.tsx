import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription as AlertDesc } from "@/components/ui/alert";
import {
  PlusCircle,
  Eye,
  Pencil,
  Trash2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import DataForm from "./DataForm";

interface DataItem {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
}

interface DashboardProps {
  session?: any;
  supabase?: any;
  apiService?: any;
  isLocalDb?: boolean;
  isUsingApi?: boolean;
  isUsingPostgres?: boolean;
  token?: string;
  onLogout?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  session,
  supabase,
  apiService,
  isLocalDb = false,
  isUsingApi = false,
  isUsingPostgres = false,
  token = "mock-token",
  onLogout = () => {},
}) => {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<DataItem | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // Mock data for demonstration
  const mockData: DataItem[] = [
    {
      id: "1",
      name: "Project Alpha",
      description: "Main development project for Q1",
      status: "active",
      createdAt: "2023-01-15T10:30:00Z",
    },
    {
      id: "2",
      name: "Database Migration",
      description: "Migrate legacy data to new system",
      status: "pending",
      createdAt: "2023-02-20T14:45:00Z",
    },
    {
      id: "3",
      name: "API Integration",
      description: "Connect to third-party payment service",
      status: "completed",
      createdAt: "2023-01-05T09:15:00Z",
    },
    {
      id: "4",
      name: "Security Audit",
      description: "Quarterly security review",
      status: "active",
      createdAt: "2023-03-10T11:00:00Z",
    },
  ];

  // Fetch data from database
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isUsingApi && apiService) {
        // Use API service
        const { data: items, error } = await apiService.fetchData();
        if (error) throw new Error(error);
        setData(items || []);
      } else if (isLocalDb && supabase && session?.user?.id) {
        // Use local database
        const { data: items, error } = await supabase.fetchData(
          session.user.id,
        );
        if (error) throw error;
        setData(items || []);
      } else {
        // Fallback to mock data
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setData(mockData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClick = () => {
    setSelectedItem(null);
    setFormMode("create");
    setFormOpen(true);
  };

  const handleEditClick = (item: DataItem) => {
    setSelectedItem(item);
    setFormMode("edit");
    setFormOpen(true);
  };

  const handleViewClick = (item: DataItem) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteItemId(id);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (formData: Partial<DataItem>) => {
    try {
      if (isUsingApi && apiService) {
        // Use API service
        if (formMode === "create") {
          const { data: newItem, error } = await apiService.createItem({
            name: formData.name || "",
            description: formData.description || "",
            status: formData.status || "pending",
            category: formData.category,
            quantity: formData.quantity,
          });
          if (error) throw new Error(error);
          setData([...data, newItem]);
        } else if (formMode === "edit" && selectedItem) {
          const { data: updatedItem, error } = await apiService.updateItem(
            selectedItem.id,
            formData,
          );
          if (error) throw new Error(error);
          const updatedData = data.map((item) =>
            item.id === selectedItem.id ? updatedItem : item,
          );
          setData(updatedData);
        }
      } else if (isLocalDb && supabase && session?.user?.id) {
        if (formMode === "create") {
          const { data: newItem, error } = await supabase.createItem({
            name: formData.name || "",
            description: formData.description || "",
            status: formData.status || "pending",
            category: formData.category,
            quantity: formData.quantity,
            user_id: session.user.id,
          });
          if (error) throw error;
          setData([...data, newItem]);
        } else if (formMode === "edit" && selectedItem) {
          const { data: updatedItem, error } = await supabase.updateItem(
            selectedItem.id,
            formData,
          );
          if (error) throw error;
          const updatedData = data.map((item) =>
            item.id === selectedItem.id ? updatedItem : item,
          );
          setData(updatedData);
        }
      } else {
        // Fallback to mock behavior
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (formMode === "create") {
          const newItem: DataItem = {
            id: `${Date.now()}`,
            name: formData.name || "",
            description: formData.description || "",
            status: formData.status || "pending",
            createdAt: new Date().toISOString(),
          };
          setData([...data, newItem]);
        } else if (formMode === "edit" && selectedItem) {
          const updatedData = data.map((item) =>
            item.id === selectedItem.id ? { ...item, ...formData } : item,
          );
          setData(updatedData);
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setError(error instanceof Error ? error.message : "Failed to save item");
    }

    setFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItemId) return;

    try {
      if (isUsingApi && apiService) {
        // Use API service
        const { error } = await apiService.deleteItem(deleteItemId);
        if (error) throw new Error(error);
      } else if (isLocalDb && supabase) {
        const { error } = await supabase.deleteItem(deleteItemId);
        if (error) throw error;
      } else {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const filteredData = data.filter((item) => item.id !== deleteItemId);
      setData(filteredData);
    } catch (error) {
      console.error("Error deleting item:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete item",
      );
    }

    setDeleteDialogOpen(false);
    setDeleteItemId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-white">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Dashboard</CardTitle>
            <CardDescription>
              Manage your data entries{" "}
              {isUsingApi
                ? "(API Mode)"
                : isLocalDb
                  ? isUsingPostgres
                    ? "(PostgreSQL Database)"
                    : "(Local Database)"
                  : "(Mock Data)"}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleCreateClick}
              className="flex items-center gap-1"
            >
              <PlusCircle className="h-4 w-4" />
              Create New
            </Button>
            <Button variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDesc>{error}</AlertDesc>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={fetchData}
              >
                <RefreshCw className="h-4 w-4 mr-1" /> Retry
              </Button>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-gray-500"
                      >
                        No data available. Create your first entry.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.description}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewClick(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {data.length} {data.length === 1 ? "item" : "items"} total
          </div>
        </CardFooter>
      </Card>

      {/* Create/Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Create New Item" : "Edit Item"}
            </DialogTitle>
            <DialogDescription>
              {formMode === "create"
                ? "Add a new item to your collection"
                : "Update the details of your item"}
            </DialogDescription>
          </DialogHeader>
          <DataForm
            initialData={selectedItem}
            mode={formMode || "create"}
            onSubmit={handleFormSubmit}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Name</h4>
                <p>{selectedItem.name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Description
                </h4>
                <p>{selectedItem.description}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedItem.status)}`}
                >
                  {selectedItem.status}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Created At
                </h4>
                <p>{new Date(selectedItem.createdAt).toLocaleString()}</p>
              </div>
              <div className="pt-4">
                <Button
                  onClick={() => setDetailsOpen(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
