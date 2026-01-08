// default panel component which will be used to render different panels in the circuit editor such as
// the circuit palette, properties panel, etc

type PanelProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Panel({ children, className }: PanelProps) {
  return (
    <div className={`overflow-y-auto backdrop-blur-sm bg-white/10 border-1 border-gray-500 ${className}`}>
      {children}
    </div>
  );
}
