import { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { db, storage } from "../../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from "@mui/material";
import "./VoucherManagement.css";

const VoucherManagement = () => {
  const [vouchers, setVouchers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    sponsor: "",
    value: "",
    ecoPoints: "",
    image: ""
  });

  // For delete confirmation
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "vouchers"), (snapshot) => {
      setVouchers(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    return () => {
      if (imageFile) URL.revokeObjectURL(imageFile);
    };
  }, [imageFile]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setForm({
      sponsor: "",
      value: "",
      ecoPoints: "",
      image: ""
    });
    setImageFile(null);
    setEditId(null);
  };

  // Upload image then save event
  const uploadImageAndSave = async () => {
    let imageURL = form.image;

    if (imageFile) {
      const imgRef = ref(storage, `vouchers/${imageFile.name}`);
      await uploadBytes(imgRef, imageFile);
      imageURL = await getDownloadURL(imgRef);
    }

    const payload = {
      ...form,
      image: imageURL,
      ecoPoints: Number(form.ecoPoints)
    }

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
    if (deleteId) {
      await deleteDoc(doc(db, "vouchers", deleteId));
      setDeleteId(null);
      setShowConfirmationModal(false);
    }
  };

  const columns = [
    { field: "sponsor", headerName: "Sponsor", flex: 1 },
    { field: "value", headerName: "Value", flex: 1 },
    { field: "ecoPoints", headerName: "EcoPoints", flex: 1 },
    {
      field: "image",
      headerName: "Image",
      renderCell: (params) => (
        <img
          src={params.row.image}
          alt="Voucher"
          style={{ width: 70, height: 50, borderRadius: 6, objectFit: "cover" }}
        />
      ),
      flex: 1
    },
    {
      field: "actions",
      headerName: "Actions",
      renderCell: (params) => (
        <div style={{ display: "flex", gap: "10px", padding: "3px 5px" }}>
          <Button
            className="edit-button"
            variant="outlined"
            onClick={() => {
              setEditId(params.row.id);
              setForm(params.row);
              handleOpen();
            }}
          >
            Edit
          </Button>
          <Button
            className="delete-button"
            variant="contained"
            onClick={() => handleDeleteClick(params.row.id)}
          >
            Delete
          </Button>
        </div>
      ),
      flex: 1
    }
  ];

  return (
    <div
      className="admin-page-content"
      style={{ padding: 30, width: "100%", boxSizing: "border-box" }}
    >
      <div className="admin-page-header">
        <h2 className="admin-page-title">Voucher Management</h2>

        <Button
          variant="contained"
          onClick={handleOpen}
          style={{ marginBottom: 20 }}
          className="add-voucher-button"
        >
          Add Voucher
        </Button>
      </div>

      <div style={{ width: "100%", overflowX: "auto" }}>
        <DataGrid autoHeight rows={vouchers} columns={columns} pageSize={5} />
      </div>

      <Dialog
        className="add-voucher-dialog"
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editId ? "Edit Voucher" : "Add Voucher"}</DialogTitle>

        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2.5, paddingTop: 2 }}
        >
          <TextField
            label="Voucher Sponsor"
            fullWidth
            value={form.sponsor}
            onChange={(e) => setForm({ ...form, sponsor: e.target.value })}
          />

          <TextField
            label="Value"
            type="number"
            fullWidth
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />

          <TextField
            label="EcoPoints"
            type="number"
            fullWidth
            value={form.ecoPoints}
            onChange={(e) => setForm({ ...form, ecoPoints: e.target.value })}
          />

          <div className="image-upload-box">
            <Button variant="outlined" component="label" fullWidth>
              Upload Voucher Image
              <input hidden type="file" onChange={(e) => setImageFile(e.target.files[0])} />
            </Button>

            {(imageFile || form.image) && (
              <img
                src={imageFile ? URL.createObjectURL(imageFile) : form.image}
                alt="Preview"
                className="voucher-image-preview"
              />
            )}
          </div>
        </DialogContent>

        <DialogActions style={{ padding: "20px 25px" }}>
          <div className="dialog-buttons-container">
            <Button className="cancel-button" onClick={handleClose}>
              Cancel
            </Button>
            <Button className="save-button" variant="contained" onClick={uploadImageAndSave}>
              {editId ? "Update" : "Save"}
            </Button>
          </div>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {showConfirmationModal && (
        <div className="delete-modal">
          <div className="delete-modal-content">
            <p className="delete-prompt">Are you sure you want to delete this voucher?</p>
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
  )
};

export default VoucherManagement;