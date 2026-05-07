import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

// Reusable responsive confirmation dialog
// Props:
// - open: boolean
// - title: string | ReactNode
// - description: string | ReactNode
// - confirmText?: string (default: "Confirm")
// - cancelText?: string (default: "Cancel")
// - onConfirm: () => void
// - onCancel: () => void
// - maxWidth?: Dialog['props']['maxWidth']
// - fullWidth?: boolean
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  maxWidth = "sm",
  fullWidth = true,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Dialog
      fullScreen={fullScreen}
      open={open}
      onClose={onCancel}
      aria-labelledby="confirm-dialog-title"
      maxWidth={maxWidth}
      fullWidth={fullWidth}
    >
      {title ? (
        <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      ) : null}
      {description ? (
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
        </DialogContent>
      ) : null}
      <DialogActions>
        <Button onClick={onCancel} autoFocus variant="outlined">
          {cancelText}
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
