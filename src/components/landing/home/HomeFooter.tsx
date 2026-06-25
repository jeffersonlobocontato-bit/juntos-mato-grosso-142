import { ShieldCheck } from "lucide-react";

const HomeFooter = () => {
  return (
    <footer className="relative z-10 mt-16 px-4 md:px-8 lg:px-12 pb-10">
      <div className="container mx-auto flex items-start gap-3 text-foreground/80">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary shadow-md">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <p className="text-sm md:text-base leading-snug">
          Transparência, diálogo e participação. <br />
          Esse é o caminho do <strong className="text-primary">Paraná</strong> que queremos.
        </p>
      </div>
    </footer>
  );
};

export default HomeFooter;