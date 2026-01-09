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
  Tab
} from "@mui/material";
import "./ItemModeration.css";

const DonationModeration = () => {
  const [donations, setDonations] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // 0 = active, 1 = completed

  const [open, setOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Fetch donations from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "donations"), (snap) => {
      setDonations(
        snap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
          checked: d.data().checked || false // default to false if missing
        }))
      );
    });
    return unsub;
  }, []);

  // Filter donations by status
  const activeDonations = donations.filter((d) => d.status === "active");
  const pendingDonations = donations.filter((d) => d.status === "pending");
  const completedDonations = donations.filter((d) => d.status === "completed");

  const handleView = async (donation) => {
    setSelectedDonation(donation);
    setOpen(true);

    // Update local state so tick persists immediately
    setDonations(prevItems =>
      prevItems.map(i =>
        i.id === donation.id ? { ...i, checked: true } : i
      )
    );

    // Persist to Firestore
    try {
      const donationRef = doc(db, "donations", donation.id);
      await updateDoc(donationRef, { checked: true });
    } catch (err) {
      console.error("Error updating donation:", err);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDonation(null);
  };

  const handleDeleteFromDialog = () => {
    if (!selectedDonation) return;
    setDeleteId(selectedDonation.id);
    setOpen(false);
    setShowConfirmationModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    await deleteDoc(doc(db, "donations", deleteId));
    setDeleteId(null);
    setShowConfirmationModal(false);
  };

  const columns = [
    { field: "title", headerName: "Title", flex: 1 },
    { field: "donorName", headerName: "Donor Name", flex: 1 },
    { field: "donorEmail", headerName: "Donor Email", flex: 1 },
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
        <h2 className="item-admin-title">Donation Moderation</h2>
      </div>

      <div className="item-tabs-wrapper">
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} className="item-tabs">
          <Tab label="Active" />
          <Tab label="Pending" />
          <Tab label="Completed" />
        </Tabs>
      </div>

      {/* Active Donations */}
      {activeTab === 0 && (
        <div className="item-table-card">
          <DataGrid autoHeight rows={activeDonations} columns={columns} pageSize={5} rowsPerPageOptions={[5]} />
        </div>
      )}

      {/* Pending Donations */}
      {activeTab === 1 && (
        <div className="item-table-card">
          <DataGrid autoHeight rows={pendingDonations} columns={columns} pageSize={5} rowsPerPageOptions={[5]} />
        </div>
      )}

      {/* Completed Donations */}
      {activeTab === 2 && (
        <div className="item-table-card">
          <DataGrid autoHeight rows={completedDonations} columns={columns} pageSize={5} rowsPerPageOptions={[5]} />
        </div>
      )}

      {/* View Donation Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle className="item-dialog-title">Donation Details</DialogTitle>
        <DialogContent dividers>
          <div className="item-dialog-content">
            <TextField label="Title" value={selectedDonation?.title || ""} fullWidth margin="normal" InputProps={{ readOnly: true }} />
            <TextField
              label="Description"
              value={selectedDonation?.description || ""}
              fullWidth
              multiline
              rows={4}
              margin="normal"
              InputProps={{ readOnly: true }}
            />
            <TextField label="Donor Name" value={selectedDonation?.donorName || ""} fullWidth margin="normal" InputProps={{ readOnly: true }} />
            <TextField label="Donor Email" value={selectedDonation?.donorEmail || ""} fullWidth margin="normal" InputProps={{ readOnly: true }} />
            <TextField label="Category" value={selectedDonation?.category || ""} fullWidth margin="normal" InputProps={{ readOnly: true }} />
            <TextField label="Condition" value={selectedDonation?.condition || ""} fullWidth margin="normal" InputProps={{ readOnly: true }} />

            {Array.isArray(selectedDonation?.locations) && (
              <TextField
                label="Location"
                value={selectedDonation.locations.join("\n")}
                fullWidth
                multiline
                rows={selectedDonation.locations.length}
                margin="normal"
                InputProps={{ readOnly: true }}
              />
            )}

            {Array.isArray(selectedDonation?.images) && (
              <div className="item-images-container">
                {selectedDonation.images.map((img, index) => (
                  <img key={index} src={img} alt={`Donation ${index + 1}`} className="item-detail-image" />
                ))}
              </div>
            )}
          </div>
        </DialogContent>

        <DialogActions className="item-dialog-actions">
          <button className="item-close-btn" onClick={handleClose}>
            Close
          </button>
          <button className="item-delete-btn" onClick={handleDeleteFromDialog}>
            Delete
          </button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {showConfirmationModal && (
        <div className="delete-modal">
          <div className="delete-modal-content">
            <p className="delete-prompt">Are you sure you want to delete this donation? This action cannot be undone.</p>
            <div className="delete-confirmation-buttons-container">
              <button onClick={handleConfirmDelete} className="delete-yes-button">
                Delete
              </button>
              <button onClick={() => setShowConfirmationModal(false)} className="delete-cancel-button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationModeration;
