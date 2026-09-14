import Swal from 'sweetalert2';

const AppSwal = Swal.mixin({
  confirmButtonColor: '#00894a',
  cancelButtonColor: '#647187',
  customClass: {
    popup: 'appSwalPopup',
    title: 'appSwalTitle'
  }
});

/**
 * Ask confirmation before performing an action.
 * Returns true if confirmed, false otherwise.
 */
export const confirmAction = async ({
  title = 'Are you sure?',
  text = '',
  icon = 'warning',
  confirmButtonText = 'Yes, proceed',
  cancelButtonText = 'Cancel',
  danger = false
}) => {
  const result = await AppSwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: danger ? '#dc2626' : '#00894a',
    cancelButtonColor: '#647187',
    reverseButtons: true
  });
  return result.isConfirmed;
};

export const requestCancellationReason = async () => {
  const result = await AppSwal.fire({
    title: 'Cancel this booking?',
    text: 'This will release the slot for other users.',
    icon: 'warning',
    input: 'select',
    inputLabel: 'Cancellation reason',
    inputOptions: {
      'Plans changed': 'Plans changed',
      'Found another venue': 'Found another venue',
      'Weather or travel issue': 'Weather or travel issue',
      'Unable to attend': 'Unable to attend',
      other: 'Other reason',
    },
    inputPlaceholder: 'Choose a reason',
    inputValidator: (value) => !value && 'Please choose a reason.',
    showCancelButton: true,
    confirmButtonText: 'Cancel booking',
    cancelButtonText: 'Keep booking',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#647187',
    reverseButtons: true,
  });

  if (!result.isConfirmed) return null;
  if (result.value !== 'other') return result.value;

  const other = await AppSwal.fire({
    title: 'Other reason',
    input: 'textarea',
    inputLabel: 'Tell us why you are cancelling',
    inputPlaceholder: 'Enter your reason',
    inputValidator: (value) => !value?.trim() && 'Please enter your reason.',
    showCancelButton: true,
    confirmButtonText: 'Submit cancellation',
    cancelButtonText: 'Keep booking',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#647187',
    reverseButtons: true,
  });
  return other.isConfirmed ? other.value.trim() : null;
};

export const showSuccess = (title, text = '') => {
  return AppSwal.fire({
    icon: 'success',
    title,
    text,
    timer: 2000,
    showConfirmButton: false
  });
};

export const showError = (title, text = '') => {
  return AppSwal.fire({
    icon: 'error',
    title,
    text
  });
};

export const showInfo = (title, text = '') => {
  return AppSwal.fire({
    icon: 'info',
    title,
    text
  });
};

export default AppSwal;
