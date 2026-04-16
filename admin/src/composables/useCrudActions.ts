type MessageLike = {
  success: (content: string) => void;
  error: (content: string) => void;
};

type DialogLike = {
  warning: (options: {
    title: string;
    content: string;
    positiveText?: string;
    negativeText?: string;
    onPositiveClick?: () => void | Promise<void>;
  }) => void;
};

type ConfirmExecuteOptions = {
  title: string;
  content: string;
  successMessage: string;
  execute: () => Promise<unknown>;
  errorMessage?: string;
  onSuccess?: () => Promise<void> | void;
};

type ExecuteOptions = {
  execute: () => Promise<unknown>;
  successMessage: string;
  errorMessage?: string;
  onSuccess?: () => Promise<void> | void;
};

type CrudActionsOptions = {
  message: MessageLike;
  dialog: DialogLike;
  mapErrorMessage: (error: unknown, fallbackMessage: string) => string;
};

export const useCrudActions = (options: CrudActionsOptions) => {
  const runWithFeedback = async (runOptions: ExecuteOptions) => {
    try {
      await runOptions.execute();
      options.message.success(runOptions.successMessage);
      await runOptions.onSuccess?.();
    } catch (error) {
      options.message.error(
        options.mapErrorMessage(error, runOptions.errorMessage ?? '操作失败'),
      );
    }
  };

  const confirmAndRun = (confirmOptions: ConfirmExecuteOptions) => {
    options.dialog.warning({
      title: confirmOptions.title,
      content: confirmOptions.content,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: async () => {
        await runWithFeedback({
          execute: confirmOptions.execute,
          successMessage: confirmOptions.successMessage,
          errorMessage: confirmOptions.errorMessage,
          onSuccess: confirmOptions.onSuccess,
        });
      },
    });
  };

  return {
    runWithFeedback,
    confirmAndRun,
  };
};
