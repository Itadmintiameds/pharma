import React from "react";
import Link from "next/link";

type IconProps = { className?: string };

// Icons are inlined (rather than served from /public/dashboard/*.svg) because
// the auth middleware's matcher ("/dashboard/:path*") intercepts static
// assets under that prefix too, redirecting anonymous requests to /login.

function IconWarehouse({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="96" height="96" rx="48" fill="#F8F8F9" />
      <path
        d="M65.0322 31.0641C65.0322 32.1652 64.1425 33.0549 63.0413 33.0549H54.5766C54.0243 33.0924 53.4823 32.8981 53.08 32.5197C52.6744 32.1413 52.4459 31.6129 52.4459 31.0606C52.4459 30.5083 52.6744 29.9799 53.08 29.6015C53.4823 29.2231 54.0243 29.0288 54.5766 29.0663H63.0413C64.1425 29.0697 65.0322 29.9663 65.0322 31.0641ZM63.0413 34.8618H54.5766C54.0243 34.8243 53.4823 35.0187 53.08 35.3971C52.6744 35.7755 52.4459 36.3039 52.4459 36.8562C52.4459 37.4084 52.6744 37.9369 53.08 38.3153C53.4823 38.6937 54.0243 38.888 54.5766 38.8505H63.0413C64.0913 38.7789 64.9095 37.9096 64.9095 36.8562C64.9095 35.8027 64.0913 34.9301 63.0413 34.8618ZM35.1856 35.8027H28.2038C27.389 35.9698 26.8061 36.6857 26.8061 37.5141C26.8061 38.3459 27.389 39.0584 28.2038 39.2254H35.1856C35.697 39.3277 36.2322 39.1981 36.6379 38.8674C37.0436 38.5333 37.2788 38.039 37.2788 37.514C37.2788 36.989 37.0436 36.4947 36.6379 36.164C36.2323 35.8299 35.6971 35.7005 35.1856 35.8027ZM63.0413 65.7207H54.5766C54.0243 65.6832 53.4823 65.8775 53.08 66.2559C52.6744 66.6343 52.4459 67.1628 52.4459 67.715C52.4459 68.2673 52.6744 68.7957 53.08 69.1741C53.4823 69.5526 54.0243 69.7469 54.5766 69.7094H63.0413C64.0913 69.6412 64.9095 68.7685 64.9095 67.715C64.9095 66.6615 64.0913 65.7889 63.0413 65.7207ZM63.0413 71.5161H54.5766C54.0243 71.4786 53.4823 71.6729 53.08 72.0514C52.6744 72.4298 52.4459 72.9582 52.4459 73.5105C52.4459 74.0627 52.6744 74.5912 53.08 74.9696C53.4823 75.348 54.0243 75.5423 54.5766 75.5048H63.0413C64.0913 75.4332 64.9095 74.5639 64.9095 73.5104C64.9095 72.457 64.0913 71.5844 63.0413 71.5161ZM35.1856 72.457H28.2038C27.389 72.6241 26.8061 73.34 26.8061 74.1683C26.8061 75.0002 27.389 75.7126 28.2038 75.8797H35.1856C35.697 75.982 36.2322 75.8524 36.6379 75.5217C37.0436 75.1876 37.2788 74.6933 37.2788 74.1683C37.2788 73.6433 37.0436 73.1489 36.6379 72.8183C36.2323 72.4842 35.6971 72.3547 35.1856 72.457ZM81.0309 11.5948V86.1518C81.0309 86.2678 80.9831 86.3803 80.9013 86.4621C80.8195 86.5439 80.707 86.5882 80.5945 86.5882H76.115C75.8763 86.5882 75.6786 86.3939 75.6786 86.1518V83.4042H20.1924V86.1518C20.1924 86.2678 20.1446 86.3803 20.0628 86.4621C19.981 86.5439 19.8719 86.5882 19.756 86.5882H15.2765C15.0378 86.5882 14.8401 86.3939 14.8401 86.1518V11.5948C14.7992 10.8584 15.0617 10.1391 15.5696 9.60041C16.0742 9.06518 16.7799 8.76177 17.5163 8.76177C18.2527 8.76177 18.9583 9.06518 19.4629 9.60041C19.9708 10.139 20.2333 10.8584 20.1924 11.5948V41.2675H23.247C22.9265 40.8652 22.7526 40.3675 22.7492 39.8527V26.4581C22.7595 25.2001 23.7788 24.1876 25.0367 24.1876H38.3903H38.3869C39.6517 24.1876 40.6744 25.2104 40.6744 26.4751V39.8182C40.671 40.333 40.4972 40.8308 40.1767 41.233H44.9937C44.6699 40.8307 44.4926 40.3331 44.4892 39.8182V15.7467C44.4926 14.4887 45.5153 13.466 46.7767 13.4626H70.8343C72.0991 13.4626 73.1218 14.4853 73.1218 15.7467V39.8182C73.1184 40.333 72.9445 40.8308 72.6241 41.233H75.6786V11.5603C75.6377 10.8239 75.9002 10.1012 76.4082 9.56593C76.9127 9.03071 77.6184 8.72729 78.3548 8.72729C79.0912 8.72729 79.7968 9.03071 80.3014 9.56593C80.8094 10.1012 81.0719 10.8239 81.031 11.5603L81.0309 11.5948ZM46.7763 41.2675H70.8339C71.6146 41.2675 72.2487 40.6334 72.2487 39.8527V15.7471C72.2487 14.9664 71.6146 14.3357 70.8339 14.3357H62.6419V17.3016C62.6419 19.4187 60.9237 21.1334 58.8101 21.1334C56.693 21.1334 54.9783 19.4187 54.9783 17.3016V14.3357H46.7761C45.9954 14.3391 45.3647 14.9698 45.3613 15.7471V39.8187C45.3647 40.5959 45.9954 41.2266 46.7761 41.2335L46.7763 41.2675ZM25.0367 41.2675H38.3903H38.3869C39.1676 41.2675 39.8017 40.6334 39.8017 39.8527V26.4581C39.7982 26.0831 39.6482 25.7285 39.3858 25.4661C39.1198 25.2036 38.7619 25.057 38.3869 25.0604H34.2347V26.7104C34.2347 28.1013 33.1062 29.2331 31.7119 29.2331C30.3177 29.2331 29.1892 28.1012 29.1892 26.7104V25.0604H25.037C24.6586 25.057 24.2972 25.207 24.0347 25.4729C23.7688 25.7388 23.6188 26.1002 23.6222 26.4751V39.8183C23.6222 40.1933 23.7722 40.5512 24.0347 40.8171C24.3007 41.083 24.662 41.233 25.037 41.233L25.0367 41.2675ZM19.3196 82.9673V11.5948C19.3537 11.0936 19.1798 10.6027 18.8389 10.2379C18.4946 9.86975 18.0174 9.66179 17.5162 9.66179C17.0151 9.66179 16.5378 9.86975 16.1969 10.2379C15.8526 10.6027 15.6788 11.0936 15.7128 11.5948V85.7155H19.3162L19.3196 82.9673ZM25.0367 77.8877H38.3903H38.3869C39.1676 77.8877 39.8017 77.2536 39.8017 76.473V63.1124C39.7982 62.7374 39.6482 62.3828 39.3858 62.1203C39.1198 61.8578 38.7619 61.7113 38.3869 61.7147H34.2347V63.3646C34.2347 64.7556 33.1062 65.8874 31.7119 65.8874C30.3177 65.8874 29.1892 64.7555 29.1892 63.3646V61.7147H25.037C24.6586 61.7113 24.2972 61.8613 24.0347 62.1272C23.7688 62.3931 23.6188 62.7544 23.6222 63.1294V76.4725C23.6222 76.8475 23.7722 77.2055 24.0347 77.4714C24.3007 77.7373 24.6617 77.8877 25.0367 77.8877ZM46.7763 77.8877H70.8339C71.6146 77.8877 72.2487 77.2536 72.2487 76.473V52.4014C72.2487 51.6207 71.6146 50.99 70.8339 50.99H62.6419V53.9559C62.6419 56.073 60.9237 57.7877 58.8101 57.7877C56.693 57.7877 54.9783 56.073 54.9783 53.9559V50.99H46.7761C45.9954 50.9934 45.3647 51.6241 45.3613 52.4014V76.473C45.3647 77.2502 45.9956 77.8809 46.7763 77.8877ZM75.6819 77.8877L75.6785 46.7488H20.1923V77.8877H23.2468C22.9263 77.4855 22.7525 76.9878 22.7491 76.473V63.1124C22.7593 61.8544 23.7786 60.8419 25.0366 60.8419H38.3902H38.3868C39.6515 60.8419 40.6743 61.8646 40.6743 63.1294V76.4725C40.6709 76.9873 40.497 77.4851 40.1766 77.8873H44.9936C44.6697 77.485 44.4924 76.9873 44.489 76.4725V52.401C44.4924 51.143 45.5152 50.1203 46.7765 50.1169H70.8341C72.0989 50.1169 73.1216 51.1396 73.1216 52.401V76.4725C73.1182 76.9873 72.9444 77.4851 72.6239 77.8873L75.6819 77.8877ZM80.1581 11.5605C80.1921 11.0593 80.0183 10.5684 79.674 10.2002C79.3331 9.83546 78.8558 9.6275 78.3547 9.6275C77.8535 9.6275 77.3762 9.83546 77.032 10.2002C76.691 10.5684 76.5172 11.0593 76.5513 11.5605V85.7152H80.1547L80.1581 11.5605Z"
        fill="#5A5B58"
      />
    </svg>
  );
}

function IconInventory({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="18" fill="#F8F8F9" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.0117 9.61056C13.4944 8.86918 15.4947 8.43042 17.6665 8.43042C19.8383 8.43042 21.8386 8.86918 23.3213 9.61056C24.763 10.3314 25.9165 11.4544 25.9165 12.8992V23.2117C25.9165 24.6565 24.763 25.7795 23.3213 26.5003C21.8386 27.2417 19.8383 27.6804 17.6665 27.6804C15.4947 27.6804 13.4944 27.2417 12.0117 26.5003C10.57 25.7795 9.4165 24.6565 9.4165 23.2117V12.8992C9.4165 11.4544 10.57 10.3314 12.0117 9.61056ZM10.7915 15.4134V16.3367C10.7915 16.98 11.331 17.7477 12.6266 18.3954C13.881 19.0226 15.6619 19.4304 17.6665 19.4304C19.6711 19.4304 21.452 19.0226 22.7064 18.3954C24.002 17.7477 24.5415 16.98 24.5415 16.3367V15.4134C24.1785 15.7078 23.7635 15.9667 23.3213 16.1878C21.8386 16.9292 19.8383 17.3679 17.6665 17.3679C15.4947 17.3679 13.4944 16.9292 12.0117 16.1878C11.5695 15.9667 11.1545 15.7078 10.7915 15.4134ZM24.5415 18.8509C24.1785 19.1453 23.7635 19.4042 23.3213 19.6253C21.8386 20.3667 19.8383 20.8054 17.6665 20.8054C15.4947 20.8054 13.4944 20.3667 12.0117 19.6253C11.5695 19.4042 11.1545 19.1453 10.7915 18.8509V19.7742C10.7915 20.4175 11.331 21.1852 12.6266 21.8329C13.881 22.4601 15.6619 22.8679 17.6665 22.8679C19.6711 22.8679 21.452 22.4601 22.7064 21.8329C24.002 21.1852 24.5415 20.4175 24.5415 19.7742V18.8509ZM24.5415 22.2884C24.1785 22.5828 23.7635 22.8417 23.3213 23.0628C21.8386 23.8042 19.8383 24.2429 17.6665 24.2429C15.4947 24.2429 13.4944 23.8042 12.0117 23.0628C11.5695 22.8417 11.1545 22.5828 10.7915 22.2884V23.2117C10.7915 23.855 11.331 24.6227 12.6266 25.2704C13.881 25.8976 15.6619 26.3054 17.6665 26.3054C19.6711 26.3054 21.452 25.8976 22.7064 25.2704C24.002 24.6227 24.5415 23.855 24.5415 23.2117V22.2884ZM12.6266 10.8404C11.331 11.4882 10.7915 12.2558 10.7915 12.8992C10.7915 13.5425 11.331 14.3102 12.6266 14.9579C13.881 15.5851 15.6619 15.9929 17.6665 15.9929C19.6711 15.9929 21.452 15.5851 22.7064 14.9579C24.002 14.3102 24.5415 13.5425 24.5415 12.8992C24.5415 12.2558 24.002 11.4882 22.7064 10.8404C21.452 10.2132 19.6711 9.80542 17.6665 9.80542C15.6619 9.80542 13.881 10.2132 12.6266 10.8404Z"
        fill="#5A5B58"
      />
    </svg>
  );
}

function IconPurchase({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="18" fill="#F8F8F9" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.13721 10.7614C9.13721 10.4203 9.41374 10.1437 9.75485 10.1437H10.8963C11.597 10.1437 12.2072 10.615 12.388 11.289L12.3883 11.29L12.5785 12.0037C17.0599 11.9219 21.5327 12.4415 25.8773 13.5492C26.0438 13.5917 26.185 13.7015 26.2672 13.8524C26.3493 14.0032 26.3649 14.1815 26.3103 14.3443C25.6231 16.3908 24.8067 18.3788 23.872 20.2967C23.7685 20.509 23.5529 20.6437 23.3167 20.6437H14.0784C13.587 20.6437 13.1157 20.839 12.7682 21.1865C12.5709 21.3837 12.4227 21.6209 12.3314 21.879H24.5784C24.9195 21.879 25.196 22.1556 25.196 22.4967C25.196 22.8378 24.9195 23.1143 24.5784 23.1143H11.6078C11.2667 23.1143 10.9901 22.8378 10.9901 22.4967C10.9901 21.6776 11.3155 20.8921 11.8947 20.313C12.2867 19.9209 12.7734 19.6451 13.301 19.5079L11.1949 11.6091C11.1949 11.609 11.1949 11.6092 11.1949 11.6091C11.1582 11.4729 11.0355 11.379 10.8963 11.379H9.75485C9.41374 11.379 9.13721 11.1025 9.13721 10.7614ZM14.5529 19.4084H22.929C23.6756 17.8452 24.3418 16.2352 24.9214 14.5851C20.9877 13.6393 16.9518 13.1856 12.9065 13.2342L14.5529 19.4084ZM11.352 24.0938C11.5836 23.8621 11.8978 23.732 12.2254 23.732C12.5531 23.732 12.8673 23.8621 13.0989 24.0938C13.3306 24.3254 13.4607 24.6397 13.4607 24.9673C13.4607 25.2949 13.3306 25.6091 13.0989 25.8408C12.8673 26.0724 12.5531 26.2026 12.2254 26.2026C11.8978 26.2026 11.5836 26.0724 11.352 25.8408C11.1203 25.6091 10.9901 25.2949 10.9901 24.9673C10.9901 24.6397 11.1203 24.3254 11.352 24.0938ZM21.852 24.0938C22.0836 23.8621 22.3978 23.732 22.7254 23.732C23.0531 23.732 23.3673 23.8621 23.5989 24.0938C23.8306 24.3254 23.9607 24.6397 23.9607 24.9673C23.9607 25.2949 23.8306 25.6091 23.5989 25.8408C23.3673 26.0724 23.0531 26.2026 22.7254 26.2026C22.3978 26.2026 22.0836 26.0724 21.852 25.8408C21.6203 25.6091 21.4902 25.2949 21.4902 24.9673C21.4902 24.6397 21.6203 24.3254 21.852 24.0938Z"
        fill="#5A5B58"
      />
    </svg>
  );
}

function IconSales({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="18" fill="#F8F8F9" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22.8228 10.4929C22.6332 10.4929 22.479 10.6471 22.479 10.8367V25.2742C22.479 25.3653 22.5152 25.4528 22.5797 25.5172C22.6442 25.5817 22.7316 25.6179 22.8228 25.6179H24.8853C25.0748 25.6179 25.229 25.4637 25.229 25.2742V10.8367C25.229 10.6471 25.0748 10.4929 24.8853 10.4929H22.8228ZM21.104 10.8367C21.104 9.88772 21.8738 9.11792 22.8228 9.11792H24.8853C25.8342 9.11792 26.604 9.88772 26.604 10.8367V25.2742C26.604 26.2231 25.8342 26.9929 24.8853 26.9929H22.8228C22.3669 26.9929 21.9297 26.8118 21.6074 26.4895C21.2851 26.1672 21.104 25.73 21.104 25.2742V10.8367ZM16.6353 14.6179C16.4457 14.6179 16.2915 14.7721 16.2915 14.9617V25.2742C16.2915 25.3653 16.3277 25.4528 16.3922 25.5172C16.4567 25.5817 16.5441 25.6179 16.6353 25.6179H18.6978C18.8873 25.6179 19.0415 25.4637 19.0415 25.2742V14.9617C19.0415 14.7721 18.8873 14.6179 18.6978 14.6179H16.6353ZM14.9165 14.9617C14.9165 14.0127 15.6863 13.2429 16.6353 13.2429H18.6978C19.6467 13.2429 20.4165 14.0127 20.4165 14.9617V25.2742C20.4165 26.2231 19.6467 26.9929 18.6978 26.9929H16.6353C16.1794 26.9929 15.7422 26.8118 15.4199 26.4895C15.0976 26.1672 14.9165 25.73 14.9165 25.2742V14.9617ZM10.4478 18.7429C10.2582 18.7429 10.104 18.8971 10.104 19.0867V25.2742C10.104 25.3653 10.1402 25.4528 10.2047 25.5172C10.2692 25.5817 10.3566 25.6179 10.4478 25.6179H12.5103C12.6998 25.6179 12.854 25.4637 12.854 25.2742V19.0867C12.854 18.8971 12.6998 18.7429 12.5103 18.7429H10.4478ZM8.729 19.0867C8.729 18.1377 9.49881 17.3679 10.4478 17.3679H12.5103C13.4592 17.3679 14.229 18.1377 14.229 19.0867V25.2742C14.229 26.2231 13.4592 26.9929 12.5103 26.9929H10.4478C9.99191 26.9929 9.55474 26.8118 9.23241 26.4895C8.91009 26.1672 8.729 25.73 8.729 25.2742V19.0867Z"
        fill="#5A5B58"
      />
    </svg>
  );
}

function IconSuppliers({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="18" fill="#F8F8F9" />
      <path
        d="M17.6687 26.9929C15.6304 26.9947 13.627 26.4639 11.857 25.4529C11.7647 25.3971 11.6863 25.321 11.6276 25.2305C11.5688 25.1401 11.5313 25.0375 11.5179 24.9304C10.4942 24.936 9.47708 24.7654 8.51117 24.4262C8.3858 24.3812 8.27602 24.3011 8.19478 24.1955C8.11355 24.0899 8.06426 23.9632 8.05284 23.8304C8.00533 23.2405 8.11097 22.6484 8.35944 22.1112C8.60791 21.5741 8.99082 21.1103 9.47114 20.7645C9.95147 20.4188 10.5129 20.2029 11.1011 20.1378C11.6893 20.0727 12.2844 20.1606 12.8287 20.3929C13.4055 19.6619 14.1409 19.0715 14.9794 18.6666C15.8179 18.2616 16.7376 18.0527 17.6687 18.0554C18.5999 18.0527 19.5195 18.2616 20.358 18.6666C21.1965 19.0715 21.9319 19.6619 22.5087 20.3929C23.0195 20.1726 23.5768 20.0813 24.1312 20.1271C25.0338 20.1997 25.8713 20.6256 26.4617 21.3121C27.0521 21.9987 27.3478 22.8904 27.2845 23.7937C27.2731 23.9265 27.2238 24.0532 27.1426 24.1588C27.0614 24.2644 26.9516 24.3445 26.8262 24.3896C25.8566 24.7142 24.842 24.8843 23.8195 24.8938C23.8064 25.002 23.7681 25.1057 23.7076 25.1965C23.6471 25.2872 23.5661 25.3625 23.4712 25.4163C21.7083 26.4405 19.7075 26.9841 17.6687 26.9929ZM12.8379 24.4262C14.3211 25.2093 15.9731 25.6183 17.6504 25.6179C19.3215 25.6161 20.967 25.2071 22.4445 24.4262V24.2429C22.4381 23.3398 22.1776 22.4567 21.6928 21.6946C21.2609 21.0117 20.6624 20.4499 19.9537 20.0618C19.2449 19.6738 18.4492 19.4723 17.6412 19.4763C16.8332 19.4723 16.0375 19.6738 15.3287 20.0618C14.62 20.4499 14.0215 21.0117 13.5895 21.6946C13.1128 22.4525 12.8587 23.3292 12.8562 24.2246V24.4446L12.8379 24.4262ZM9.41872 23.2804C10.0973 23.4629 10.7968 23.5554 11.4995 23.5554C11.5744 22.8718 11.7635 22.2057 12.0587 21.5846C11.7732 21.4967 11.4719 21.4722 11.1759 21.5127C10.8798 21.5533 10.5963 21.658 10.3449 21.8194C10.0935 21.9809 9.88042 22.1953 9.72045 22.4476C9.56048 22.7 9.45752 22.9842 9.41872 23.2804ZM23.8012 23.5554C24.5046 23.5569 25.2048 23.4613 25.882 23.2713C25.8295 22.8809 25.6638 22.5144 25.4054 22.2171C25.2329 22.0084 25.0194 21.8372 24.7782 21.7142C24.537 21.5912 24.2731 21.519 24.0029 21.5021C23.7433 21.4744 23.4807 21.5026 23.2328 21.5846C23.5364 22.2031 23.7288 22.8702 23.8012 23.5554ZM23.8012 18.7429C23.2573 18.7429 22.7256 18.5817 22.2734 18.2795C21.8211 17.9773 21.4687 17.5478 21.2605 17.0453C21.0524 16.5428 20.9979 15.9899 21.104 15.4564C21.2101 14.923 21.4721 14.433 21.8567 14.0484C22.2413 13.6638 22.7312 13.4019 23.2647 13.2958C23.7981 13.1897 24.3511 13.2441 24.8536 13.4523C25.3561 13.6604 25.7856 14.0129 26.0877 14.4651C26.3899 14.9173 26.5512 15.449 26.5512 15.9929C26.5513 16.716 26.2666 17.4099 25.7588 17.9246C25.2509 18.4393 24.5608 18.7333 23.8379 18.7429H23.8012ZM23.8012 14.6179C23.5293 14.6179 23.2634 14.6986 23.0373 14.8496C22.8112 15.0007 22.6349 15.2155 22.5308 15.4667C22.4268 15.718 22.3996 15.9945 22.4526 16.2612C22.5057 16.5279 22.6366 16.7729 22.8289 16.9652C23.0212 17.1575 23.2662 17.2884 23.5329 17.3415C23.7997 17.3945 24.0761 17.3673 24.3274 17.2632C24.5786 17.1592 24.7934 16.9829 24.9445 16.7568C25.0956 16.5307 25.1762 16.2649 25.1762 15.9929C25.1764 15.6345 25.0365 15.2902 24.7865 15.0334C24.5366 14.7765 24.1962 14.6275 23.8379 14.6179H23.8012ZM11.4262 18.7429C10.8823 18.7429 10.3506 18.5817 9.89837 18.2795C9.44613 17.9773 9.09367 17.5478 8.88553 17.0453C8.67739 16.5428 8.62293 15.9899 8.72904 15.4564C8.83515 14.923 9.09707 14.433 9.48166 14.0484C9.86626 13.6638 10.3562 13.4019 10.8897 13.2958C11.4231 13.1897 11.9761 13.2441 12.4786 13.4523C12.9811 13.6604 13.4106 14.0129 13.7127 14.4651C14.0149 14.9173 14.1762 15.449 14.1762 15.9929C14.1763 16.716 13.8916 17.4099 13.3838 17.9246C12.8759 18.4393 12.1858 18.7333 11.4629 18.7429H11.4262ZM11.4262 14.6179C11.1543 14.6179 10.8884 14.6986 10.6623 14.8496C10.4362 15.0007 10.2599 15.2155 10.1558 15.4667C10.0518 15.718 10.0246 15.9945 10.0776 16.2612C10.1307 16.5279 10.2616 16.7729 10.4539 16.9652C10.6462 17.1575 10.8912 17.2884 11.1579 17.3415C11.4247 17.3945 11.7011 17.3673 11.9524 17.2632C12.2036 17.1592 12.4184 16.9829 12.5695 16.7568C12.7206 16.5307 12.8012 16.2649 12.8012 15.9929C12.8014 15.6345 12.6615 15.2902 12.4115 15.0334C12.1616 14.7765 11.8211 14.6275 11.4629 14.6179H11.4262ZM17.6137 16.6804C16.9339 16.6804 16.2692 16.4788 15.7039 16.1011C15.1386 15.7234 14.698 15.1865 14.4378 14.5584C14.1777 13.9303 14.1096 13.2391 14.2422 12.5723C14.3749 11.9055 14.7023 11.293 15.183 10.8123C15.6638 10.3315 16.2763 10.0041 16.9431 9.87148C17.6099 9.73884 18.3011 9.8069 18.9292 10.0671C19.5573 10.3272 20.0942 10.7678 20.4719 11.3331C20.8496 11.8984 21.0512 12.5631 21.0512 13.2429C21.0513 14.1483 20.6942 15.0171 20.0574 15.6607C19.4207 16.3043 18.5557 16.6708 17.6504 16.6804H17.6137ZM17.6137 11.1804C17.2058 11.1804 16.807 11.3014 16.4678 11.528C16.1287 11.7546 15.8643 12.0768 15.7082 12.4536C15.5521 12.8305 15.5113 13.2452 15.5908 13.6453C15.6704 14.0454 15.8669 14.4129 16.1553 14.7013C16.4437 14.9898 16.8113 15.1862 17.2113 15.2658C17.6114 15.3454 18.0261 15.3045 18.403 15.1484C18.7799 14.9923 19.102 14.728 19.3286 14.3888C19.5552 14.0496 19.6762 13.6509 19.6762 13.2429C19.6763 12.7022 19.464 12.1831 19.0851 11.7973C18.7062 11.4116 18.191 11.19 17.6504 11.1804H17.6137Z"
        fill="#5A5B58"
      />
    </svg>
  );
}

function IconCustomer({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="18" fill="#F8F8F9" />
      <path
        d="M14.5673 26.9929C12.3842 26.9959 10.2418 26.4032 8.3706 25.2788C8.27002 25.2196 8.18662 25.1352 8.12873 25.0339C8.07084 24.9326 8.04044 24.8179 8.04055 24.7013V24.6004C8.03814 23.7418 8.2052 22.8911 8.53212 22.0971C8.85904 21.3032 9.33943 20.5815 9.94573 19.9735C10.552 19.3655 11.2723 18.8831 12.0653 18.554C12.8584 18.2248 13.7086 18.0554 14.5673 18.0554C15.5746 18.0564 16.5682 18.2893 17.4711 18.736C18.374 19.1826 19.1619 19.8311 19.7739 20.6313C20.4229 20.0275 21.2366 19.6302 22.1118 19.4896C22.9869 19.3491 23.8841 19.4718 24.6895 19.842C25.4948 20.2123 26.1721 20.8135 26.6352 21.5693C27.0983 22.3251 27.3264 23.2014 27.2906 24.0871C27.2829 24.2111 27.2435 24.331 27.176 24.4354C27.1086 24.5397 27.0155 24.625 26.9056 24.6829C25.6353 25.2911 24.244 25.6045 22.8356 25.5996C22.1037 25.6019 21.3743 25.5157 20.6631 25.3429C18.8154 26.4286 16.7103 26.9984 14.5673 26.9929ZM9.39726 24.2979C10.9713 25.1679 12.7412 25.6222 14.5397 25.6179C16.3323 25.6211 18.096 25.1668 19.6639 24.2979C19.6254 23.5408 19.4187 22.8019 19.0589 22.1346C18.6137 21.3258 17.9594 20.6516 17.1644 20.1823C16.3694 19.713 15.4629 19.466 14.5397 19.4671C13.2235 19.4696 11.958 19.975 11.0021 20.8798C10.0462 21.7846 9.47207 23.0205 9.39726 24.3346V24.2979ZM22.7897 24.2429C23.8447 24.2425 24.8889 24.0305 25.8606 23.6196C25.8 22.9365 25.5166 22.2924 25.0539 21.7863C24.7596 21.4713 24.403 21.2209 24.0067 21.0512C23.6105 20.8815 23.1832 20.7961 22.7521 20.8004C22.3211 20.8047 21.8957 20.8986 21.5029 21.0762C21.1101 21.2539 20.7585 21.5113 20.4706 21.8321C20.7865 22.5306 20.9818 23.2775 21.0481 24.0413C21.6177 24.1621 22.1983 24.2235 22.7806 24.2246L22.7897 24.2429ZM22.7897 18.0554C22.1762 18.0572 21.5759 17.8768 21.065 17.5371C20.554 17.1973 20.1555 16.7135 19.9198 16.147C19.6842 15.5805 19.6221 14.9568 19.7414 14.3549C19.8606 13.753 20.1559 13.2001 20.5897 12.7662C21.0236 12.3324 21.5765 12.0371 22.1784 11.9179C22.7803 11.7986 23.404 11.8607 23.9705 12.0964C24.537 12.332 25.0208 12.7305 25.3606 13.2415C25.7003 13.7524 25.8807 14.3527 25.8789 14.9663C25.8789 15.784 25.5547 16.5683 24.9773 17.1474C24.4 17.7265 23.6166 18.053 22.7989 18.0554H22.7897ZM22.7897 13.2429C22.4485 13.2411 22.1144 13.3406 21.8298 13.5289C21.5452 13.7171 21.3229 13.9857 21.1911 14.3004C21.0592 14.6151 21.0238 14.9619 21.0892 15.2968C21.1547 15.6317 21.3181 15.9396 21.5588 16.1816C21.7994 16.4235 22.1064 16.5885 22.441 16.6558C22.7755 16.723 23.1225 16.6894 23.4379 16.5593C23.7533 16.4291 24.023 16.2082 24.2128 15.9246C24.4026 15.641 24.5039 15.3075 24.5039 14.9663C24.5039 14.5124 24.3249 14.0768 24.0057 13.7541C23.6865 13.4314 23.2528 13.2478 22.7989 13.2429H22.7897ZM14.5397 16.6804C13.7902 16.6822 13.057 16.4615 12.433 16.0462C11.809 15.6309 11.3224 15.0398 11.0347 14.3476C10.747 13.6555 10.6713 12.8935 10.8171 12.1583C10.9629 11.423 11.3236 10.7476 11.8536 10.2176C12.3836 9.68759 13.059 9.32685 13.7943 9.18106C14.5295 9.03528 15.2915 9.11103 15.9836 9.3987C16.6758 9.68638 17.2669 10.173 17.6822 10.797C18.0975 11.421 18.3182 12.1542 18.3164 12.9038C18.314 13.9031 17.9166 14.8609 17.2108 15.5684C16.505 16.2758 15.5482 16.6756 14.5489 16.6804H14.5397ZM14.5397 10.4929C14.0625 10.4911 13.5955 10.6309 13.1979 10.8947C12.8002 11.1585 12.4898 11.5345 12.3059 11.9748C12.122 12.4152 12.073 12.9002 12.1649 13.3684C12.2569 13.8367 12.4858 14.2671 12.8226 14.6052C13.1594 14.9433 13.5889 15.1738 14.0569 15.2676C14.5248 15.3613 15.01 15.3141 15.451 15.1319C15.8921 14.9497 16.2692 14.6408 16.5345 14.2441C16.7998 13.8474 16.9414 13.381 16.9414 12.9038C16.9414 12.2675 16.6899 11.6571 16.2418 11.2055C15.7936 10.7539 15.1851 10.4978 14.5489 10.4929H14.5397Z"
        fill="#5A5B58"
      />
    </svg>
  );
}

function IconReports({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="18" fill="#F8F8F9" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.0415 9.80542C8.0415 9.42572 8.34931 9.11792 8.729 9.11792H26.604C26.9837 9.11792 27.2915 9.42572 27.2915 9.80542C27.2915 10.1851 26.9837 10.4929 26.604 10.4929H25.9165V20.1179C25.9165 20.8473 25.6268 21.5467 25.111 22.0625C24.5953 22.5782 23.8959 22.8679 23.1665 22.8679H22.0579L23.1312 26.088C23.2513 26.4482 23.0566 26.8376 22.6964 26.9576C22.3362 27.0777 21.9469 26.883 21.8268 26.5228L21.5252 25.6179H13.8079L13.5062 26.5228C13.3862 26.883 12.9968 27.0777 12.6366 26.9576C12.2764 26.8376 12.0817 26.4482 12.2018 26.088L13.2751 22.8679H12.1665C11.4372 22.8679 10.7377 22.5782 10.222 22.0625C9.70624 21.5467 9.4165 20.8473 9.4165 20.1179V10.4929H8.729C8.34931 10.4929 8.0415 10.1851 8.0415 9.80542ZM10.7915 10.4929V20.1179C10.7915 20.4826 10.9364 20.8323 11.1942 21.0902C11.4521 21.3481 11.8018 21.4929 12.1665 21.4929H23.1665C23.5312 21.4929 23.8809 21.3481 24.1388 21.0902C24.3966 20.8323 24.5415 20.4826 24.5415 20.1179V10.4929H10.7915ZM14.7245 22.8679L14.2662 24.2429H21.0668L20.6085 22.8679H14.7245ZM20.4165 12.5554C20.7962 12.5554 21.104 12.8632 21.104 13.2429V18.7429C21.104 19.1226 20.7962 19.4304 20.4165 19.4304C20.0368 19.4304 19.729 19.1226 19.729 18.7429V13.2429C19.729 12.8632 20.0368 12.5554 20.4165 12.5554ZM17.6665 14.6179C18.0462 14.6179 18.354 14.9257 18.354 15.3054V18.7429C18.354 19.1226 18.0462 19.4304 17.6665 19.4304C17.2868 19.4304 16.979 19.1226 16.979 18.7429V15.3054C16.979 14.9257 17.2868 14.6179 17.6665 14.6179ZM14.9165 16.6804C15.2962 16.6804 15.604 16.9882 15.604 17.3679V18.7429C15.604 19.1226 15.2962 19.4304 14.9165 19.4304C14.5368 19.4304 14.229 19.1226 14.229 18.7429V17.3679C14.229 16.9882 14.5368 16.6804 14.9165 16.6804Z"
        fill="#5A5B58"
      />
    </svg>
  );
}

const FEATURES = [
  {
    Icon: IconWarehouse,
    title: "Warehouse Management",
    description:
      "Move stock seamlessly between your warehouse and every pharmacy location, with full transfer tracking and reconciliation.",
  },
  {
    Icon: IconInventory,
    title: "Inventory Management",
    description:
      "Track stock across every shelf and store in real time, with low-stock and expiry alerts before they become a problem.",
  },
  {
    Icon: IconPurchase,
    title: "Purchase Orders",
    description:
      "Raise, approve and receive purchase orders in a few clicks, with supplier pricing and GRN reconciliation built in.",
  },
  {
    Icon: IconSales,
    title: "Sales & Billing",
    description:
      "Fast, GST-compliant billing at the counter with UPI, card and cash support, synced to inventory automatically.",
  },
  {
    Icon: IconCustomer,
    title: "Customer Management",
    description:
      "Build a loyal customer base with purchase history, prescriptions and reminders that keep them coming back.",
  },
  {
    Icon: IconReports,
    title: "Reports & Analytics",
    description:
      "Understand what's moving, what's not, and where your margins are with reports built for pharmacy operations.",
  },
];

const STEPS = [
  {
    title: "Set up your business",
    description:
      "Register your pharmacy or warehouse, add locations, and invite your team in minutes — no paperwork, no waiting.",
  },
  {
    title: "Bring in your inventory",
    description:
      "Import your existing stock and suppliers, or start fresh. Tiameds keeps every location in sync automatically.",
  },
  {
    title: "Sell, bill and grow",
    description:
      "Serve customers with fast billing while Tiameds handles compliance, reporting and reordering in the background.",
  },
];

const HIGHLIGHTS = [
  "Real-time stock sync across multiple locations",
  "Warehouse-to-pharmacy stock transfers",
  "Role-based access for your entire team",
  "GST-ready billing and compliance documents",
];

export default function Home() {
  return (
    <div className="h-screen overflow-y-auto bg-base-white font-body">
      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 border-b border-pneutral-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-2">
            <img src="/TiamedsLogo.svg" alt="Tiameds" className="h-9 w-auto" />
          </div>

          <nav className="hidden items-center gap-9 md:flex">
            <a href="#features" className="text-label-l4 font-medium text-pneutral-700 transition-colors hover:text-secondary-700">
              Features
            </a>
            <a href="#workflow" className="text-label-l4 font-medium text-pneutral-700 transition-colors hover:text-secondary-700">
              How it works
            </a>
            <a href="#why" className="text-label-l4 font-medium text-pneutral-700 transition-colors hover:text-secondary-700">
              Why Tiameds
            </a>
            <a href="#contact" className="text-label-l4 font-medium text-pneutral-700 transition-colors hover:text-secondary-700">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden h-11 items-center justify-center rounded-lg px-5 text-label-l4 font-semibold text-pneutral-800 transition-colors hover:bg-pneutral-50 sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/registration"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-secondary-700 px-5 text-label-l4 font-semibold text-white shadow-xsm transition-all hover:bg-secondary-800 hover:shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -right-40 h-112 w-112 rounded-full bg-secondary-100 opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-104 w-104 rounded-full bg-primary-100 opacity-60 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:gap-12 lg:px-10 lg:py-28">
          {/* Left copy */}
          <div>
            <span className="inline-flex items-center rounded-full border border-secondary-200 bg-secondary-50 px-4 py-1.5 text-label-l2 font-semibold tracking-wide text-secondary-700">
              Pharmacy &amp; Warehouse Management, Simplified
            </span>

            <h1 className="mt-6 font-work-sans text-4xl font-bold leading-tight text-pneutral-900 sm:text-5xl lg:text-[52px] lg:leading-[1.1]">
              Run your pharmacy with{" "}
              <span className="bg-linear-to-r from-secondary-700 to-primary-700 bg-clip-text text-transparent">
                confidence
              </span>
              , not chaos.
            </h1>

            <p className="mt-6 max-w-xl text-p4 leading-7 text-pneutral-600">
              Tiameds brings inventory, purchases, sales, billing and suppliers
              into a single, elegant workspace — so your pharmacy or warehouse
              network runs smoothly, from the first shelf to the last invoice.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/registration"
                className="inline-flex h-13 items-center justify-center rounded-lg bg-secondary-700 px-8 text-label-l4 font-semibold text-white shadow-md transition-all hover:bg-secondary-800 hover:shadow-lg"
              >
                Get Started Free
              </Link>
              <Link
                href="/login"
                className="inline-flex h-13 items-center justify-center rounded-lg border-2 border-pneutral-200 px-8 text-label-l4 font-semibold text-pneutral-800 transition-all hover:border-secondary-300 hover:text-secondary-700"
              >
                Log in to your account
              </Link>
            </div>

            <p className="mt-5 text-p3 text-pneutral-500">
              No credit card required &middot; Set up your business in minutes
            </p>
          </div>

          {/* Right visual: product preview card */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="rounded-xl border border-pneutral-100 bg-white p-6 shadow-xlg">
              <div className="flex items-center justify-between border-b border-pneutral-100 pb-4">
                <div>
                  <p className="text-label-l3 font-semibold text-pneutral-900">Today&apos;s Overview</p>
                  <p className="text-p2 text-pneutral-500">Central Pharmacy &middot; All locations</p>
                </div>
                <span className="rounded-full bg-success-50 px-3 py-1 text-label-l1 font-semibold text-success-700">
                  Live
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-secondary-50 p-4">
                  <IconInventory className="h-9 w-9" />
                  <p className="mt-3 text-h6 font-bold text-pneutral-900">4,382</p>
                  <p className="text-p2 text-pneutral-600">Products in stock</p>
                </div>
                <div className="rounded-lg bg-primary-100/60 p-4">
                  <IconSales className="h-9 w-9" />
                  <p className="mt-3 text-h6 font-bold text-pneutral-900">₹1.2L</p>
                  <p className="text-p2 text-pneutral-600">Sales today</p>
                </div>
                <div className="rounded-lg bg-info-50 p-4">
                  <IconPurchase className="h-9 w-9" />
                  <p className="mt-3 text-h6 font-bold text-pneutral-900">18</p>
                  <p className="text-p2 text-pneutral-600">Pending orders</p>
                </div>
                <div className="rounded-lg bg-pneutral-50 p-4">
                  <IconSuppliers className="h-9 w-9" />
                  <p className="mt-3 text-h6 font-bold text-pneutral-900">64</p>
                  <p className="text-p2 text-pneutral-600">Active suppliers</p>
                </div>
              </div>

              <div className="mt-5 flex items-end gap-1.5 rounded-lg bg-pneutral-50 p-4">
                {[40, 65, 50, 80, 60, 95, 70].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-linear-to-t from-secondary-700 to-secondary-400"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-6 -left-6 hidden items-center gap-3 rounded-lg border border-pneutral-100 bg-white px-4 py-3 shadow-lg sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-50 text-success-700">
                ✓
              </span>
              <div>
                <p className="text-label-l3 font-semibold text-pneutral-900">Stock synced</p>
                <p className="text-p2 text-pneutral-500">All locations up to date</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-label-l3 font-semibold uppercase tracking-wider text-secondary-700">
            Everything in one place
          </span>
          <h2 className="mt-3 font-work-sans text-3xl font-bold text-pneutral-900 sm:text-4xl">
            Built for how pharmacies actually work
          </h2>
          <p className="mt-4 text-p4 text-pneutral-600">
            From the stockroom to the billing counter, Tiameds covers every part
            of running a modern pharmacy or warehouse network.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-pneutral-100 bg-white p-7 transition-all duration-200 hover:-translate-y-1 hover:border-secondary-300 hover:bg-linear-to-br hover:from-secondary-50 hover:to-primary-100/40 hover:shadow-lg hover:shadow-secondary-200/50"
            >
              <div className="inline-flex rounded-lg bg-secondary-50 p-2.5 transition-all duration-200 group-hover:scale-110 group-hover:bg-linear-to-br group-hover:from-secondary-500 group-hover:to-primary-600 group-hover:shadow-md">
                <feature.Icon className="h-9 w-9" />
              </div>
              <h3 className="mt-5 text-h6 font-semibold text-pneutral-900 transition-colors group-hover:text-secondary-800">{feature.title}</h3>
              <p className="mt-2 text-p3 leading-6 text-pneutral-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="workflow" className="bg-pneutral-50 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-label-l3 font-semibold uppercase tracking-wider text-secondary-700">
              Simple to start
            </span>
            <h2 className="mt-3 font-work-sans text-3xl font-bold text-pneutral-900 sm:text-4xl">
              Up and running in three steps
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="absolute top-7 left-1/2 hidden h-px w-full bg-pneutral-200 md:block" />
                )}
                <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-h6 font-bold text-secondary-700 shadow-md">
                  {i + 1}
                </div>
                <h3 className="mt-6 text-h6 font-semibold text-pneutral-900">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-p3 leading-6 text-pneutral-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= WHY TIAMEDS ================= */}
      <section id="why" className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div className="relative">
            <div className="rounded-xl bg-linear-to-br from-secondary-700 to-primary-800 p-10 text-white shadow-xlg">
              <p className="text-label-l3 font-semibold uppercase tracking-wider text-secondary-100">
                Why Tiameds
              </p>
              <h3 className="mt-4 font-work-sans text-2xl font-bold sm:text-3xl">
                One platform for every location you operate.
              </h3>
              <p className="mt-4 text-p4 leading-7 text-secondary-100">
                Whether you run a single counter pharmacy or a network of
                warehouses and stores, Tiameds keeps stock, sales and
                compliance in sync — everywhere, all the time.
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-work-sans text-3xl font-bold text-pneutral-900 sm:text-4xl">
              Designed to remove the busywork
            </h2>
            <p className="mt-4 text-p4 text-pneutral-600">
              Tiameds replaces spreadsheets, registers and disconnected tools
              with a single system built specifically for pharmacy operations.
            </p>

            <ul className="mt-8 space-y-4">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-secondary-700">
                    ✓
                  </span>
                  <span className="text-p4 text-pneutral-800">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ================= CTA BANNER ================= */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="relative overflow-hidden rounded-xl bg-linear-to-r from-secondary-700 to-primary-800 px-8 py-16 text-center sm:px-16">
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

          <h2 className="relative font-work-sans text-3xl font-bold text-white sm:text-4xl">
            Ready to modernize your pharmacy?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-p4 text-secondary-100">
            Join hundreds of pharmacies already managing their business with
            Tiameds. Get started in minutes — no setup fees.
          </p>
          <div className="relative mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/registration"
              className="inline-flex h-13 items-center justify-center rounded-lg bg-white px-8 text-label-l4 font-semibold text-secondary-700 shadow-md transition-transform hover:scale-[1.03]"
            >
              Create your account
            </Link>
            <Link
              href="/login"
              className="inline-flex h-13 items-center justify-center rounded-lg border-2 border-white/40 px-8 text-label-l4 font-semibold text-white transition-colors hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer id="contact" className="border-t border-pneutral-100 bg-pneutral-50">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <img src="/TiamedsLogo.svg" alt="Tiameds" className="h-8 w-auto" />
              <p className="mt-4 text-p3 leading-6 text-pneutral-600">
                Pharmacy and warehouse management, built for the way you
                actually work.
              </p>
            </div>

            <div>
              <p className="text-label-l3 font-semibold text-pneutral-900">Product</p>
              <ul className="mt-4 space-y-3">
                <li><a href="#features" className="text-p3 text-pneutral-600 hover:text-secondary-700">Features</a></li>
                <li><a href="#workflow" className="text-p3 text-pneutral-600 hover:text-secondary-700">How it works</a></li>
                <li><a href="#why" className="text-p3 text-pneutral-600 hover:text-secondary-700">Why Tiameds</a></li>
              </ul>
            </div>

            <div>
              <p className="text-label-l3 font-semibold text-pneutral-900">Account</p>
              <ul className="mt-4 space-y-3">
                <li><Link href="/login" className="text-p3 text-pneutral-600 hover:text-secondary-700">Log in</Link></li>
                <li><Link href="/registration" className="text-p3 text-pneutral-600 hover:text-secondary-700">Register</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-label-l3 font-semibold text-pneutral-900">Company</p>
              <ul className="mt-4 space-y-3">
                <li><span className="text-p3 text-pneutral-600">support@tiameds.ai</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-pneutral-200 pt-6 sm:flex-row">
            <p className="text-p2 text-pneutral-500">
              © 2026 Tiameds. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
