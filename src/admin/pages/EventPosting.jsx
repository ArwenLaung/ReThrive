import { useEffect, useState } from "react";
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
  Box,
} from "@mui/material";
import "./EventPosting.css";

const EventPosting = () => {
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [tab, setTab] = useState(0);

  const [form, setForm] = useState({
    title: "",
    image: "",
    date: "",
    time: "",
    location: "",
    description: "",
    ecoPoints: "",
    ecoHighlights: [],
  });

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), (snap) => {
      setEvents(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
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
    setEditId(null);
    setImageFile(null);
    setForm({
      title: "",
      image: "",
      date: "",
      time: "",
      location: "",
      description: "",
      ecoPoints: "",
      ecoHighlights: [],
    });
  };

  const uploadImageAndSave = async () => {
    let imageURL = form.image;

    if (imageFile) {
      const imgRef = ref(storage, `events/${imageFile.name}`);
      await uploadBytes(imgRef, imageFile);
      imageURL = await getDownloadURL(imgRef);
    }

    const payload = {
      ...form,
      image: imageURL,
      ecoPoints: Number(form.ecoPoints),
      ecoHighlights: form.ecoHighlights.filter((l) => l.trim() !== ""),
    };

    if (editId) {
      await updateDoc(doc(db, "events", editId), payload);
    } else {
      await addDoc(collection(db, "events"), payload);
    }

    handleClose();
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowConfirmationModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    await deleteDoc(doc(db, "events", deleteId));
    setDeleteId(null);
    setShowConfirmationModal(false);
  };

  const today = new Date().toISOString().split("T")[0];

  const ongoingEvents = events.filter((e) => e.date >= today);
  const pastEvents = events.filter((e) => e.date < today);

  const columns = [
    { field: "title", headerName: "Title", flex: 1 },
    {
      field: "image",
      headerName: "Image",
      flex: 1,
      renderCell: (params) => (
        <img
          src={params.row.image}
          alt="event"
          className="event-table-image"
        />
      ),
    },
    { field: "date", headerName: "Date", flex: 1 },
    { field: "time", headerName: "Time", flex: 1 },
    { field: "location", headerName: "Location", flex: 1 },
    { field: "ecoPoints", headerName: "EcoPoints", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="event-actions-cell">
          <button
            className="event-edit-btn"
            onClick={() => {
              setEditId(params.row.id);
              setForm(params.row);
              handleOpen();
            }}
          >
            Edit
          </button>
          <button
            className="event-delete-btn"
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
      <div className="event-admin-header">
        <h2>Event Posting</h2>
      </div>

      <div className="options">
        <div className="event-tabs-wrapper">
          <Tabs
            value={tab}
            onChange={(e, newValue) => setTab(newValue)}
          >
            <Tab label="Ongoing" />
            <Tab label="Past" />
          </Tabs>
        </div>

        <button className="event-add-btn" onClick={handleOpen}>
          + Add Event
        </button>
      </div>


      <Box className="event-table-card">

        <div style={{ marginTop: 16 }}>
          {tab === 0 && (
            <DataGrid
              autoHeight
              rows={ongoingEvents}
              columns={columns}
              pageSize={5}
            />
          )}

          {tab === 1 && (
            <DataGrid
              autoHeight
              rows={pastEvents}
              columns={columns}
              pageSize={5}
            />
          )}
        </div>
      </Box>

      {/* ADD / EDIT DIALOG (unchanged) */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle className="event-dialog-title">
          {editId ? "Edit Event" : "Add Event"}
        </DialogTitle>

        <DialogContent className="event-dialog-content">
          <TextField
            label="Event Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <div className="event-image-upload">
            <label className="event-upload-btn">
              Upload Event Image
              <input
                hidden
                type="file"
                onChange={(e) => setImageFile(e.target.files[0])}
              />
            </label>

            {(imageFile || form.image) && (
              <img
                className="event-preview-image"
                src={imageFile ? URL.createObjectURL(imageFile) : form.image}
                alt="Preview"
              />
            )}
          </div>

          <div className="event-two-col">
            <TextField
              type="date"
              label="Date"
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <TextField
              type="time"
              label="Time"
              InputLabelProps={{ shrink: true }}
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>

          <TextField
            label="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />

          <TextField
            label="Description"
            multiline
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <TextField
            label="EcoPoints"
            type="number"
            value={form.ecoPoints}
            onChange={(e) =>
              setForm({ ...form, ecoPoints: e.target.value })
            }
          />

          <TextField
            label="Eco Highlights (one per line)"
            multiline
            minRows={2}
            value={form.ecoHighlights.join("\n")}
            onChange={(e) =>
              setForm({
                ...form,
                ecoHighlights: e.target.value.split("\n"),
              })
            }
          />
        </DialogContent>

        <DialogActions className="event-dialog-actions">
          <button className="event-cancel-btn" onClick={handleClose}>
            Cancel
          </button>
          <button className="event-save-btn" onClick={uploadImageAndSave}>
            {editId ? "Update" : "Save"}
          </button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRMATION (unchanged) */}
      {showConfirmationModal && (
        <div className="delete-modal">
          <div className="delete-modal-content">
            <p className="delete-prompt">
              Are you sure you want to delete this event? This action cannot be
              undone.
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

export default EventPosting;