import { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { db } from "../../firebase";
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import {
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tabs,
  Tab,
} from "@mui/material";
import "./ItemModeration.css";

const MarketplaceModeration = () => {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // 0 = active, 1 = sold

  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // 🔹 Fetch items from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "items"), (snap) => {
      setItems(
        snap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
          checked: d.data().checked || false, // default to false if missing
        }))
      );
    });
    return unsub;
  }, []);

  // 🔹 Filter items by status
  const activeItems = items.filter((item) => item.status === "active");
  const pendingItems = items.filter((item) => item.status === "pending");
  const soldItems = items.filter((item) => item.status === "sold");

  const handleView = async (item) => {
    setSelectedItem(item);
    setOpen(true);

    // Update local state so tick persists immediately
    setItems(prevItems =>
      prevItems.map(i =>
        i.id === item.id ? { ...i, checked: true } : i
      )
    );

    // Persist to Firestore
    try {
      const itemRef = doc(db, "items", item.id);
      await updateDoc(itemRef, { checked: true });
    } catch (err) {
      console.error("Error updating item:", err);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedItem(null);
  };

  const handleDeleteFromDialog = () => {
    if (!selectedItem) return;
    setDeleteId(selectedItem.id);
    setOpen(false); // close details dialog
    setShowConfirmationModal(true); // open confirmation modal
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    await deleteDoc(doc(db, "items", deleteId));
    setDeleteId(null);
    setShowConfirmationModal(false);
  };

  const columns = [
    { field: "title", headerName: "Title", flex: 1 },
    { field: "sellerName", headerName: "Seller Name", flex: 1 },
    { field: "sellerEmail", headerName: "Seller Email", flex: 1 },
    { field: "price", headerName: "Price", width: 120 },
    { field: "category", headerName: "Category", flex: 1 },
    { field: "condition", headerName: "Condition", flex: 1 },
    {
      field: "checked",
      headerName: "Checked",
      width: 100,
      renderCell: (params) => (
        <span style={{ fontSize: "18px", color: "green" }}>
          {params.row.checked ? "✔" : ""}
        </span>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 180,
      renderCell: (params) => (
        <div className="item-actions-cell">
          <button className="item-view-btn" onClick={() => handleView(params.row)}>
            View
          </button>
          <button
            className="item-action-delete-btn"
            onClick={() => {
              setDeleteId(params.row.id);
              setShowConfirmationModal(true);
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-page-content">
      <div className="item-admin-header">
        <h2 className="item-admin-title">Marketplace Moderation</h2>
      </div>

      <div className="item-tabs-wrapper">
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          className="item-tabs"
        >
          <Tab label="Active" />
          <Tab label="Pending" />
          <Tab label="Sold" />
        </Tabs>
      </div>

      {/* 🔹 active Items */}
      {activeTab === 0 && (
        <div className="item-table-card">
          <DataGrid
            autoHeight
            rows={activeItems}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5]}
          />
        </div>
      )}

      {/* 🔹 Pending Items */}
      {activeTab === 1 && (
        <div className="item-table-card">
          <DataGrid
            autoHeight
            rows={pendingItems}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5]}
          />
        </div>
      )}

      {/* 🔹 Sold Items */}
      {activeTab === 2 && (
        <div className="item-table-card">
          <DataGrid
            autoHeight
            rows={soldItems}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5]}
          />
        </div>
      )}

      {/* 🔹 View Item Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle className="item-dialog-title">Item Details</DialogTitle>
        <DialogContent dividers>
          <div className="item-dialog-content">
            <TextField label="Title" value={selectedItem?.title || ""} fullWidth margin="normal" InputProps={{ readOnly: true }} />
            <TextField label="Description" value={selectedItem?.description || ""} fullWidth multiline rows={4} margin="normal" InputProps={{ readOnly: true }} />
            <TextField label="Seller Name" value={selectedItem?.sellerName || ""} fullWidth margin="normal" InputProps={{ readOnly: true }} />
            <TextField label="Seller Email" value={selectedItem?.sellerEmail || ""} fullWidth margin="normal" InputProps={{ readOnly: true }} />
            <TextField label="Price" value={selectedItem?.price || ""} fullWidth margin="normal" InputProps={{ readOnly: true }} />
            <TextField label="Category" value={selectedItem?.category || ""} fullWidth margin="normal" InputProps={{ readOnly: true }} />
            <TextField label="Condition" value={selectedItem?.condition || ""} fullWidth margin="normal" InputProps={{ readOnly: true }} />

            {Array.isArray(selectedItem?.locations) && (
              <TextField label="Location" value={selectedItem.locations.join("\n")} fullWidth multiline rows={selectedItem.locations.length} margin="normal" InputProps={{ readOnly: true }} />
            )}

            {Array.isArray(selectedItem?.images) && (
              <div className="item-images-container">
                {selectedItem.images.map((img, index) => (
                  <img key={index} src={img} alt={`Item ${index + 1}`} className="item-detail-image" />
                ))}
              </div>
            )}
          </div>
        </DialogContent>

        <DialogActions className="item-dialog-actions">
          <button className="item-close-btn" onClick={handleClose}>Close</button>
          <button className="item-delete-btn" onClick={handleDeleteFromDialog}>Delete</button>
        </DialogActions>
      </Dialog>

      {/* 🔹 Delete Confirmation Modal */}
      {showConfirmationModal && (
        <div className="delete-modal">
          <div className="delete-modal-content">
            <p className="delete-prompt">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="delete-confirmation-buttons-container">
              <button onClick={handleConfirmDelete} className="delete-yes-button">Delete</button>
              <button onClick={() => setShowConfirmationModal(false)} className="delete-cancel-button">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceModeration;
