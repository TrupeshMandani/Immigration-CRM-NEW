const Card = ({ children, className = "", ...props }) => {
  return (
    <div
      className={`rounded-xl bg-white shadow-sm border border-primary-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = "" }) => {
  return (
    <div
      className={`flex flex-col gap-2 border-b border-primary-200 p-6 ${className}`}
    >
      {children}
    </div>
  );
};

const CardBody = ({ children, className = "" }) => {
  return <div className={`p-6 ${className}`}>{children}</div>;
};

const CardFooter = ({ children, className = "" }) => {
  return (
    <div className={`border-t border-primary-200 p-6 ${className}`}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
