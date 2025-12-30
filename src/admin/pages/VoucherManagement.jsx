import { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { db, storage } from "../../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tabs,
  Tab,
} from "@mui/material";
import "./VoucherManagement.css";

const VoucherManagement = () => {
  const [vouchers, setVouchers] = useState([]);
  const [expiredVouchers, setExpiredVouchers] = useState([]);
  const [tab, setTab] = useState(0);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    sponsor: "",
    value: "",
    tnc: [],
    ecoPoints: "",
    image: null,
    expiryDate: "",
  });

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "vouchers"), (snap) => {
      setVouchers(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "expiredVouchers"), (snap) => {
      setExpiredVouchers(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    vouchers.forEach(async (v) => {
      if (v.expiryDate && v.expiryDate <= today) {
        const { id, ...data } = v;

        await addDoc(collection(db, "expiredVouchers"), data);
        await deleteDoc(doc(db, "vouchers", id));
      }
    });
  }, [vouchers]);

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
    setEditId(null);
    setImageFile(null);
    setForm({
      sponsor: "",
      value: "",
      tnc: [],
      ecoPoints: "",
      image: null,
      expiryDate: "",
      totalQuantity: "",
      remainingQuantity: "",
    });
  };

  const handleEdit = (row) => {
    setEditId(row.id);
    setForm(row);
    setOpen(true);
  };

  const uploadImageAndSave = async () => {
    let imageURL = form.image;

    if (imageFile) {
      const imgRef = ref(storage, `vouchers/${imageFile.name}`);
      await uploadBytes(imgRef, imageFile);
      imageURL = await getDownloadURL(imgRef);
    }

    const payload = {
      ...form,
      ecoPoints: Number(form.ecoPoints),
      image: imageURL,
      totalQuantity: Number(form.totalQuantity),
      remainingQuantity: editId
        ? form.remainingQuantity
        : Number(form.totalQuantity),
    };

    if (editId) {
      await updateDoc(doc(db, "vouchers", editId), payload);
    } else {
      await addDoc(collection(db, "vouchers"), payload);
    }

    handleClose();
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowConfirmationModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    const collectionName = tab === 0 ? "vouchers" : "expiredVouchers";
    await deleteDoc(doc(db, collectionName, deleteId));

    setDeleteId(null);
    setShowConfirmationModal(false);
  };

  const columns = [
    { field: "sponsor", headerName: "Sponsor", flex: 1 },
    {
      field: "image",
      headerName: "Image",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        if (!params.value) return null;
        return (
          <img
            src={params.value}
            alt="Voucher"
            style={{
              width: "80px",
              height: "50px",
              objectFit: "cover",
              borderRadius: "6px",
            }}
          />
        );
      },
    },
    { field: "value", headerName: "Value", flex: 1 },
    { field: "ecoPoints", headerName: "EcoPoints", flex: 1 },
    { field: "expiryDate", headerName: "Expiry Date", flex: 1 },
    { field: "totalQuantity", headerName: "Total Quantity", flex: 1 },
    { field: "remainingQuantity", headerName: "Remaining", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="voucher-actions-cell">
          {tab === 0 && (
            <button
              className="voucher-edit-btn"
              onClick={() => handleEdit(params.row)}
            >
              Edit
            </button>
          )}
          <button
            className="voucher-delete-btn"
            onClick={() => handleDeleteClick(params.row.id)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-page-content">
      <div className="voucher-admin-header">
        <h2>Voucher Management</h2>
      </div>

      <div className="options">
        <div className="voucher-tabs-wrapper">
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
          >
            <Tab label="Available" />
            <Tab label="Expired" />
          </Tabs>
        </div>

        {tab === 0 && (
          <div className="voucher-action-bar">
            <button className="voucher-add-btn" onClick={handleOpen}>
              + Add Voucher
            </button>
          </div>
        )}
      </div>

      <div className="voucher-table-card">
        <DataGrid
          autoHeight
          rows={tab === 0 ? vouchers : expiredVouchers}
          columns={columns}
          pageSize={5}
          rowHeight={44}
        />
      </div>

      {/* ADD / EDIT DIALOG */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle className="voucher-dialog-title">
          {editId ? "Edit Voucher" : "Add Voucher"}
        </DialogTitle>

        <DialogContent className="voucher-dialog-content">
          <TextField
            label="Sponsor"
            value={form.sponsor}
            onChange={(e) => setForm({ ...form, sponsor: e.target.value })}
          />

          <TextField
            label="Value"
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />

          <TextField
            label="Terms and Conditions"
            multiline
            minRows={3}
            value={form.tnc.join("\n")}
            onChange={(e) => setForm({ ...form, tnc: e.target.value.split("\n") })}
          />

          <TextField
            label="EcoPoints"
            type="number"
            value={form.ecoPoints}
            onChange={(e) => setForm({ ...form, ecoPoints: e.target.value })}
          />

          <TextField
            label="Expiry Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={form.expiryDate}
            onChange={(e) =>
              setForm({ ...form, expiryDate: e.target.value })
            }
          />

          <TextField
            label="Total Quantity"
            type="number"
            value={form.totalQuantity}
            onChange={(e) =>
              setForm({ ...form, totalQuantity: e.target.value })
            }
            disabled={!!editId}
          />

          <TextField
            label="Remaining Quantity"
            helperText="Auto-updated when users claim vouchers"
            disabled
            value={form.remainingQuantity}
          />

          <div className="voucher-image-upload">
            <label className="voucher-upload-btn">
              Upload Image
              <input
                hidden
                type="file"
                onChange={(e) => setImageFile(e.target.files[0])}
              />
            </label>

            {(imageFile || form.image !== null) && (
              <img
                className="voucher-preview-image"
                src={imageFile ? URL.createObjectURL(imageFile) : form.image}
                alt="Preview"
              />
            )}
          </div>
        </DialogContent>

        <DialogActions className="voucher-dialog-actions">
          <button className="voucher-cancel-btn" onClick={handleClose}>
            Cancel
          </button>
          <button className="voucher-save-btn" onClick={uploadImageAndSave}>
            {editId ? "Update" : "Save"}
          </button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL (MATCHES EVENT POSTING) */}
      {showConfirmationModal && (
        <div className="delete-modal">
          <div className="delete-modal-content">
            <p className="delete-prompt">
              Are you sure you want to delete this voucher? This action cannot be undone.
            </p>
            <div className="delete-confirmation-buttons-container">
              <button
                onClick={handleConfirmDelete}
                className="delete-yes-button"
              >
                Delete
              </button>
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="delete-cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherManagement;
