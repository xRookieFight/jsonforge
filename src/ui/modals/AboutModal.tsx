import { ModalShell } from "./ModalShell";

interface Props {
  open: boolean;
  onClose(): void;
}

export function AboutModal({ open, onClose }: Props) {
  return (
    <ModalShell title="About JsonForge" open={open} onClose={onClose} width={420}>
      <div className="jf-about">
        <h2>JsonForge</h2>
        <p>
          Visual JSON UI editor for Minecraft: Bedrock Edition.
        </p>
        <ul>
          <li>10 element types (panel, stack, collection, scrolling, image, label, button, input, toggle, custom)</li>
          <li>Made by JsonForge Developer Team</li>
          <li>github.com/jfbedrock/jsonforge</li>
        </ul>
      </div>
    </ModalShell>
  );
}
