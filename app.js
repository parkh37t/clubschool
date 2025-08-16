const data = [
  {
    project: "웹 리뉴얼",
    group: "기획그룹",
    role: "PM",
    period: "2024-01 ~ 2024-03",
    utilization: "80%",
  },
  {
    project: "앱 런칭",
    group: "디자인그룹",
    role: "디자이너",
    period: "2024-02 ~ 2024-05",
    utilization: "100%",
  },
  {
    project: "웹 접근성 개선",
    group: "퍼블리싱그룹",
    role: "퍼블리셔",
    period: "2024-03 ~ 2024-04",
    utilization: "60%",
  },
];

const tbody = document.querySelector("#dashboard tbody");

data.forEach((item) => {
  const tr = document.createElement("tr");

  Object.entries(item).forEach(([key, value]) => {
    const td = document.createElement("td");
    td.textContent = value;
    td.setAttribute("data-label", headerLabel(key));
    tr.appendChild(td);
  });

  tbody.appendChild(tr);
});

function headerLabel(key) {
  switch (key) {
    case "project":
      return "프로젝트";
    case "group":
      return "그룹";
    case "role":
      return "역할";
    case "period":
      return "기간";
    case "utilization":
      return "가동률";
    default:
      return key;
  }
}
