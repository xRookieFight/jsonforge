import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { JsonUiExporter } from "../../core/io/JsonUiExporter";
import { useProjectStore } from "../../state/projectStore";

export function JsonPreviewPanel() {
  const version = useProjectStore(s => s.version);
  const [text, setText] = useState("{}");

  const exporter = useMemo(() => new JsonUiExporter(), []);

  useEffect(() => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    if (!project.hasProject()) {
      setText("{}");
      return;
    }
    const result = exporter.export(project.getMeta().namespace, project.getRoot());
    setText(result.text);
  }, [version, exporter]);

  const copy = () => navigator.clipboard.writeText(text).catch(() => undefined);

  return (
    <div className="jf-panel jf-json-preview">
      <div className="jf-json-preview__toolbar">
        <span className="jf-json-preview__title">JSON UI Output</span>
        <button type="button" className="jf-btn jf-btn--ghost" onClick={copy}>
          Copy
        </button>
      </div>
      <div className="jf-json-preview__body">
        <Editor
          height="100%"
          language="json"
          theme="vs-dark"
          value={text}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true
          }}
        />
      </div>
    </div>
  );
}
