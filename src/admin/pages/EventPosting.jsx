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
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

const EventPosting = () => {
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    title: "",
    image: "",
    date: "",
    time: "",
    location: "",
    description: "",
    ecoPoints: "",
    ecoHighlights: "",
  });

  // LIVE updates from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), (snapshot) => {
      setEvents(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
    return unsub;
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setForm({
      title: "",
      image: "",
      date: "",
      time: "",
      location: "",
      description: "",
      ecoPoints: "",
      ecoHighlights: "",
    });
    setImageFile(null);
    setEditId(null);
  };

  // Upload image then save event
  const uploadImageAndSave = async () => {
    let imageURL = form.image;

    if (imageFile) {
      const imgRef = ref(storage, `events/${imageFile.name}`);
      await uploadBytes(imgRef, imageFile);
      imageURL = await getDownloadURL(imgRef);
    }

    if (editId) {
      await updateDoc(doc(db, "events", editId), {
        ...form,
        image: imageURL,
      });
    } else {
      await addDoc(collection(db, "events"), {
        ...form,
        image: imageURL,
      });
    }

    handleClose();
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "events", id));
  };

  const columns = [
    { field: "title", headerName: "Title", flex: 1 },
    {
      field: "image",
      headerName: "Image",
      renderCell: (params) => (
        <img
          src={params.row.image}
          alt="event"
          style={{ width: 70, height: 50, borderRadius: 6, objectFit: "cover" }}
        />
      ),
      flex: 1,
    },
    { field: "date", headerName: "Date", flex: 1 },
    { field: "time", headerName: "Time", flex: 1 },
    { field: "location", headerName: "Location", flex: 1 },
    { field: "ecoPoints", headerName: "Eco Points", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      renderCell: (params) => (
        <div style={{ display: "flex", gap: "10px" }}>
          <Button
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
            variant="contained"
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            Delete
          </Button>
        </div>
      ),
      flex: 1,
    },
  ];

  return (
    <div style={{ padding: 30 }}>
      <h2>Event Posting</h2>

      <Button variant="contained" onClick={handleOpen} style={{ marginBottom: 20 }}>
        Add Event
      </Button>

      <DataGrid autoHeight rows={events} columns={columns} pageSize={5} />

      {/* Add / Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? "Edit Event" : "Add Event"}</DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Event Title" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />

          <Button variant="outlined" component="label">
            Upload Image
            <input hidden type="file" onChange={(e) => setImageFile(e.target.files[0])} />
          </Button>

          {imageFile && <p>{imageFile.name}</p>}

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
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <TextField
            label="Eco Points"
            type="number"
            value={form.ecoPoints}
            onChange={(e) => setForm({ ...form, ecoPoints: e.target.value })}
          />

          <TextField
            label="Eco Highlights"
            multiline
            rows={2}
            value={form.ecoHighlights}
            onChange={(e) => setForm({ ...form, ecoHighlights: e.target.value })}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={uploadImageAndSave}>
            {editId ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EventPosting;