// import React from "react";

// interface AssignedLocationProps {
//   pharmacyCities: string[];
// }

// const AssignedLocation = ({ pharmacyCities }: AssignedLocationProps) => {
//   return (
//     <>
//       <div className="flex flex-col gap-2 text-pneutral-900">
//         <div className="text-p5 font-semibold font-noto-sans ">
//           Assigned Location
//         </div>
//         <div className="inline-flex w-fit items-center justify-center px-4 h-8 bg-pneutral-300 rounded-full text-p4 font-medium font-noto-sans">
//           Mysuru
//         </div>{" "}
//       </div>
//     </>
//   );
// };

// export default AssignedLocation;


import React from "react";

interface AssignedLocationProps {
  pharmacyCities: string[];
}

const AssignedLocation = ({
  pharmacyCities,
}: AssignedLocationProps) => {
  return (
    <div className="flex flex-col gap-2 text-pneutral-900">
      <div className="text-p5 font-semibold font-noto-sans">
        Assigned Location
      </div>

      <div className="flex flex-wrap gap-2">
        {pharmacyCities.length > 0 ? (
          pharmacyCities.map((city, index) => (
            <div
              key={`${city}-${index}`}
              className="inline-flex w-fit items-center justify-center px-4 h-8 bg-pneutral-300 rounded-full text-p4 font-medium font-noto-sans"
            >
              {city}
            </div>
          ))
        ) : (
          <div className="text-p4 text-pneutral-500">
            No Assigned Locations
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignedLocation;