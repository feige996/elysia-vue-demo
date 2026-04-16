<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NCard,
  NEmpty,
  NInput,
  NSpace,
  NText,
  useMessage,
} from 'naive-ui';
import { Editor } from '@wangeditor/editor-for-vue';
import '@wangeditor/editor/dist/css/style.css';

type RichDoc = {
  id: number;
  title: string;
  html: string;
  updatedAt: string; // ISO
};

const STORAGE_KEY = 'harbor_rich_text_docs';
const message = useMessage();

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const readAllDocs = (): RichDoc[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RichDoc[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAllDocs = (docs: RichDoc[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
};

const mockListDocs = async (): Promise<RichDoc[]> => {
  await delay(250);
  return readAllDocs().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
};

const mockCreateDoc = async (title: string): Promise<RichDoc> => {
  await delay(250);
  const docs = readAllDocs();
  const nextId = docs.length ? Math.max(...docs.map((d) => d.id)) + 1 : 1;
  const now = new Date().toISOString();
  const doc: RichDoc = {
    id: nextId,
    title,
    html: '<p><br/></p>',
    updatedAt: now,
  };
  docs.push(doc);
  writeAllDocs(docs);
  return doc;
};

const mockUpdateDoc = async (
  id: number,
  patch: { title: string; html: string },
) => {
  await delay(250);
  const docs = readAllDocs();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx < 0) throw new Error('doc_not_found');
  docs[idx] = {
    ...docs[idx],
    title: patch.title,
    html: patch.html,
    updatedAt: new Date().toISOString(),
  };
  writeAllDocs(docs);
  return docs[idx];
};

const mockDeleteDoc = async (id: number) => {
  await delay(200);
  const docs = readAllDocs().filter((d) => d.id !== id);
  writeAllDocs(docs);
};

const docs = ref<RichDoc[]>([]);
const loading = ref(false);

const selectedId = ref<number | null>(null);
const selectedDoc = computed(() =>
  selectedId.value === null
    ? null
    : (docs.value.find((d) => d.id === selectedId.value) ?? null),
);

// 表单输入（避免编辑时直接操作 selectedDoc 引用导致不可控）
const formTitle = ref('');

const editorInstanceRef = ref<any>(null);
const editorHtml = ref<string>('<p><br/></p>');

const refreshDocs = async () => {
  loading.value = true;
  try {
    docs.value = await mockListDocs();
  } finally {
    loading.value = false;
  }
};

const openCreate = async () => {
  const title = `新文档 ${docs.value.length + 1}`;
  loading.value = true;
  try {
    const doc = await mockCreateDoc(title);
    await refreshDocs();
    selectedId.value = doc.id;
    formTitle.value = doc.title;
    await Promise.resolve();
    editorHtml.value = doc.html;
  } finally {
    loading.value = false;
  }
};

const selectDoc = async (id: number) => {
  const doc = docs.value.find((d) => d.id === id);
  if (!doc) return;
  selectedId.value = id;
  formTitle.value = doc.title;
  // 切换后让 editor 在 DOM 就绪时再 setHtml
  await Promise.resolve();
  editorHtml.value = doc.html;
};

const saveDoc = async () => {
  const doc = selectedDoc.value;
  if (!doc) {
    message.warning('请先选择一个文档');
    return;
  }
  const title = formTitle.value.trim();
  if (!title) {
    message.warning('请输入文档标题');
    return;
  }

  const html = editorHtml.value;
  loading.value = true;
  try {
    await mockUpdateDoc(doc.id, { title, html });
    message.success('保存成功');
    await refreshDocs();
  } catch (e) {
    message.error('保存失败');
  } finally {
    loading.value = false;
  }
};

const deleteDoc = async () => {
  const doc = selectedDoc.value;
  if (!doc) {
    message.warning('请先选择一个文档');
    return;
  }
  loading.value = true;
  try {
    await mockDeleteDoc(doc.id);
    message.success('删除成功');
    await refreshDocs();
    selectedId.value = docs.value[0]?.id ?? null;
    if (selectedId.value !== null) {
      const next = docs.value.find((d) => d.id === selectedId.value);
      if (next) {
        formTitle.value = next.title;
        editorHtml.value = next.html;
      }
    }
  } catch {
    message.error('删除失败');
  } finally {
    loading.value = false;
  }
};

// Editor 配置：只做 demo，尽量保守配置
const editorConfig = reactive({
  placeholder: '在这里编辑富文本内容...',
  MENU_CONF: {},
});

onMounted(async () => {
  await refreshDocs();
  if (docs.value.length) {
    selectedId.value = docs.value[0].id;
    formTitle.value = docs.value[0].title;
    editorHtml.value = docs.value[0].html;
  } else {
    await openCreate();
  }
});

onBeforeUnmount(() => {
  const editor = editorInstanceRef.value;
  if (editor && typeof editor.destroy === 'function') editor.destroy();
});
</script>

<template>
  <div class="rich-text-root">
    <NSpace justify="space-between" align="center" class="toolbar">
      <div>
        <div class="title">富文本能力演示（模拟 CRUD）</div>
        <div class="subtitle">
          使用 localStorage 模拟：新增 / 编辑 / 保存 / 删除，并接收 HTML 内容。
        </div>
      </div>
      <NSpace>
        <NButton type="primary" :loading="loading" @click="openCreate"
          >新建</NButton
        >
        <NButton type="primary" :loading="loading" @click="saveDoc"
          >保存</NButton
        >
        <NButton :loading="loading" type="error" @click="deleteDoc"
          >删除</NButton
        >
      </NSpace>
    </NSpace>

    <div class="layout">
      <NCard title="文档列表" :bordered="false" class="list-card">
        <div v-if="loading && docs.length === 0" class="list-loading">
          加载中...
        </div>
        <NEmpty v-else-if="docs.length === 0" description="暂无文档" />
        <div v-else class="list">
          <div
            v-for="doc in docs"
            :key="doc.id"
            class="list-item"
            :class="{ 'list-item--active': doc.id === selectedId }"
            @click="selectDoc(doc.id)"
          >
            <div class="list-item__title">{{ doc.title }}</div>
            <div class="list-item__meta">
              {{ doc.updatedAt.slice(0, 19).replace('T', ' ') }}
            </div>
          </div>
        </div>
      </NCard>

      <div class="editor-panel">
        <NCard title="编辑" :bordered="false" class="editor-card">
          <NSpace vertical>
            <NInput
              v-model:value="formTitle"
              placeholder="请输入标题"
              :disabled="selectedDoc === null"
            />
            <Editor
              v-if="selectedDoc !== null"
              :default-config="editorConfig"
              v-model="editorHtml"
              @onCreated="(editor: any) => (editorInstanceRef = editor)"
            />
          </NSpace>
        </NCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rich-text-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.toolbar {
  flex-wrap: wrap;
  gap: 12px;
}

.title {
  font-weight: 600;
  font-size: 16px;
}

.subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  min-width: 0;
}

.list-card {
  height: calc(100dvh - 220px);
  overflow: hidden;
}

.list {
  height: calc(100dvh - 260px);
  overflow: auto;
  padding-right: 8px;
}

.list-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 10px;
}

.list-item--active {
  border-color: rgba(24, 160, 88, 0.6);
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.15);
}

.list-item__title {
  font-weight: 500;
  margin-bottom: 4px;
}

.list-item__meta {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.editor-panel {
  min-width: 0;
}

.editor-card {
  height: calc(100dvh - 220px);
  overflow: hidden;
}

:deep(.w-e-toolbar) {
  position: sticky;
  top: 0;
  z-index: 2;
}

/* editor content scroll inside card */
:deep(.w-e-text-container) {
  height: calc(100dvh - 360px);
  overflow: auto;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .list-card {
    height: auto;
  }
  .list {
    height: auto;
    max-height: 260px;
  }
  .editor-card {
    height: auto;
  }
  :deep(.w-e-text-container) {
    height: 360px;
  }
}
</style>
