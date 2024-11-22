const React = require('react');

const NewBadge = ({ children }) => {
  return (
    <div className="relative inline-block">
      {children}
      <span className="absolute -top-2.5 -right-3 text-[#ff5680] text-[9px] font-bold rounded-full">
        NUEVO
      </span>
    </div>
  );
};

module.exports = NewBadge;