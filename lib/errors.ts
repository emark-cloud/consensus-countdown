export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  technicalDetails?: string;
}

export function mapToUserFriendlyError(source: string, error: any): UserFriendlyError {
  const errorStr = String(error.message || error).toLowerCase();

  // Wallet errors
  if (errorStr.includes('user rejected') || errorStr.includes('user denied')) {
    return {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction in your wallet.',
      action: 'Try again when ready.',
    };
  }

  if (errorStr.includes('insufficient funds')) {
    return {
      title: 'Insufficient Balance',
      message: 'Your wallet doesn\'t have enough ETH.',
      action: 'Add more ETH to your wallet.',
    };
  }

  // Contract errors
  if (errorStr.includes('room already exists')) {
    return {
      title: 'Room Already Exists',
      message: 'A room with this ID has already been created.',
      action: 'Choose a different Room ID.',
    };
  }

  if (errorStr.includes('already voted') || errorStr.includes('vote already submitted')) {
    return {
      title: 'Already Voted',
      message: 'You have already voted in this room.',
      action: 'Wait for resolution.',
    };
  }

  if (errorStr.includes('room not found')) {
    return {
      title: 'Room Not Found',
      message: 'This room doesn\'t exist.',
      action: 'Check the Room ID or create a new room.',
    };
  }

  if (errorStr.includes('room already resolved') || errorStr.includes('already resolved')) {
    return {
      title: 'Room Already Resolved',
      message: 'This room has already been resolved.',
      action: 'Create a new room to play again.',
    };
  }

  // Network errors
  if (errorStr.includes('fetch') || errorStr.includes('network')) {
    return {
      title: 'Network Error',
      message: 'Unable to connect to GenLayer StudioNet.',
      action: 'Check your internet connection.',
    };
  }

  // GenLayer RPC errors
  if (errorStr.includes('genlayer read failed') || errorStr.includes('-32603')) {
    return {
      title: 'Contract Read Error',
      message: 'Unable to read data from the contract.',
      action: 'This might be temporary. Try refreshing the leaderboard.',
      technicalDetails: `Source: ${source}\n${String(error)}`,
    };
  }

  // Default
  return {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    action: 'Please try again.',
    technicalDetails: `Source: ${source}\n${String(error)}`,
  };
}
