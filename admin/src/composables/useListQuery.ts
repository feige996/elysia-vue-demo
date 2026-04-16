import { reactive, ref } from 'vue';

type UseListQueryOptions<TQuery, TResponse> = {
  createInitialQuery: () => TQuery;
  request: (query: TQuery) => Promise<TResponse>;
  onSuccess: (response: TResponse) => void;
  onError?: (error: unknown) => void;
};

export const useListQuery = <TQuery extends Record<string, unknown>, TResponse>(
  options: UseListQueryOptions<TQuery, TResponse>,
) => {
  const query = reactive(options.createInitialQuery()) as TQuery;
  const loading = ref(false);
  const errorText = ref('');

  const run = async () => {
    errorText.value = '';
    loading.value = true;
    try {
      const response = await options.request(query);
      options.onSuccess(response);
    } catch (error) {
      options.onError?.(error);
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    Object.assign(query, options.createInitialQuery());
  };

  return {
    query,
    loading,
    errorText,
    run,
    reset,
  };
};
