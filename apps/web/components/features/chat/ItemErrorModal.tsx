import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ItemErrorModalProps {
  open: boolean
  onClose: () => void
  errorType: 'not_found' | 'permission_denied' | 'error'
}

const ERROR_MESSAGES = {
  not_found: {
    title: 'Item Not Found',
    description: 'This item has been deleted and is no longer available.',
  },
  permission_denied: {
    title: 'Permission Denied',
    description: "You don't have permission to view this item.",
  },
  error: {
    title: 'Error',
    description: 'Failed to load item details. Please try again.',
  },
}

export function ItemErrorModal({ open, onClose, errorType }: ItemErrorModalProps) {
  const { title, description } = ERROR_MESSAGES[errorType]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
